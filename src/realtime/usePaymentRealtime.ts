import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { API_BASE_URL } from "../api/client";
import type { PaymentUpdatedData, RealtimeEvent } from "../api/types";

type PaymentRealtimeOptions = {
  enabled: boolean;
  token: string | null;
  onPaymentUpdated: (event: RealtimeEvent<PaymentUpdatedData>) => void;
  onSync: () => void | Promise<void>;
};

const MIN_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const PING_INTERVAL_MS = 25_000;

export const REALTIME_URL = `${API_BASE_URL.replace(/^http/, "ws").replace(/\/$/, "")}/ws/realtime`;

export function usePaymentRealtime({
  enabled,
  token,
  onPaymentUpdated,
  onSync,
}: PaymentRealtimeOptions) {
  const onPaymentUpdatedRef = useRef(onPaymentUpdated);
  const onSyncRef = useRef(onSync);

  useEffect(() => {
    onPaymentUpdatedRef.current = onPaymentUpdated;
  }, [onPaymentUpdated]);

  useEffect(() => {
    onSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    if (!enabled || !token) {
      return;
    }

    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectAttempt = 0;
    let disposed = false;
    let foreground =
      AppState.currentState !== "background" && AppState.currentState !== "inactive";

    const clearTimers = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || !foreground || reconnectTimer) {
        return;
      }

      const delay = Math.min(
        MIN_RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const connect = () => {
      if (disposed || !foreground || socket?.readyState === 0 || socket?.readyState === 1) {
        return;
      }

      socket = new WebSocket(REALTIME_URL);

      socket.onopen = () => {
        socket?.send(JSON.stringify({ type: "AUTH", token }));
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(String(message.data)) as RealtimeEvent<PaymentUpdatedData>;
          if (event.type === "AUTHENTICATED") {
            reconnectAttempt = 0;
            void onSyncRef.current();
            if (pingTimer) {
              clearInterval(pingTimer);
            }
            pingTimer = setInterval(() => {
              if (socket?.readyState === 1) {
                socket.send(JSON.stringify({ type: "PING" }));
              }
            }, PING_INTERVAL_MS);
            return;
          }

          if (event.type === "PAYMENT_UPDATED" && event.data) {
            onPaymentUpdatedRef.current(event);
          }
        } catch {
          // Ignore malformed or unknown server messages and keep the connection alive.
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        socket = null;
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        scheduleReconnect();
      };
    };

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      const nextForeground = nextState === "active";
      if (nextForeground === foreground) {
        return;
      }

      foreground = nextForeground;
      if (foreground) {
        void onSyncRef.current();
        connect();
      } else {
        clearTimers();
        socket?.close();
        socket = null;
      }
    });

    connect();

    return () => {
      disposed = true;
      clearTimers();
      appStateSubscription.remove();
      socket?.close();
    };
  }, [enabled, token]);
}
