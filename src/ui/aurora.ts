import { Platform } from "react-native";

/**
 * Inject aurora gradient CSS animations & global web styles.
 * Call once on app mount (guarded by Platform.OS).
 */
export function injectAuroraStyles() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const existingStyle = document.getElementById("aurora-styles");
  if (existingStyle) return;

  const style = document.createElement("style");
  style.id = "aurora-styles";
  style.textContent = `
    /* ─── Google Font ─── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    /* ─── Global Font Override ─── */
    *, *::before, *::after {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }

    /* ─── Smooth Scrollbar ─── */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(124, 58, 237, 0.25);
      border-radius: 999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(124, 58, 237, 0.4);
    }

    /* ─── Selection ─── */
    ::selection {
      background: rgba(124, 58, 237, 0.3);
      color: #f1f5f9;
    }

    /* ─── Aurora Keyframes ─── */
    @keyframes aurora-drift-1 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
      25% { transform: translate(30px, -20px) scale(1.1); opacity: 0.5; }
      50% { transform: translate(-20px, 30px) scale(0.95); opacity: 0.35; }
      75% { transform: translate(15px, 15px) scale(1.05); opacity: 0.45; }
    }

    @keyframes aurora-drift-2 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
      33% { transform: translate(-40px, 20px) scale(1.15); opacity: 0.4; }
      66% { transform: translate(25px, -30px) scale(0.9); opacity: 0.25; }
    }

    @keyframes aurora-drift-3 {
      0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
      50% { transform: translate(35px, 25px) scale(1.1); opacity: 0.35; }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(124, 58, 237, 0.1); }
      50% { box-shadow: 0 0 30px rgba(124, 58, 237, 0.2); }
    }

    @keyframes slide-in-right {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* ─── Aurora Background Blobs ─── */
    .aurora-bg {
      position: fixed;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }

    .aurora-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
    }

    .aurora-blob-1 {
      width: 600px;
      height: 600px;
      top: -10%;
      left: -5%;
      background: radial-gradient(circle, rgba(124, 58, 237, 0.2) 0%, transparent 70%);
      animation: aurora-drift-1 20s ease-in-out infinite;
    }

    .aurora-blob-2 {
      width: 500px;
      height: 500px;
      top: 40%;
      right: -10%;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%);
      animation: aurora-drift-2 25s ease-in-out infinite;
    }

    .aurora-blob-3 {
      width: 400px;
      height: 400px;
      bottom: -5%;
      left: 30%;
      background: radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, transparent 70%);
      animation: aurora-drift-3 22s ease-in-out infinite;
    }

    /* ─── Utility CSS Classes ─── */
    .glass-card {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .glass-card:hover {
      border-color: rgba(124, 58, 237, 0.2) !important;
      box-shadow: 0 0 30px rgba(124, 58, 237, 0.08), 0 4px 20px rgba(0,0,0,0.15);
    }

    .animate-fade-in {
      animation: fade-in-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .animate-slide-in {
      animation: slide-in-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Inject the aurora background div into the DOM.
 * Creates three animated gradient blobs.
 */
export function injectAuroraBackground() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const existing = document.getElementById("aurora-bg");
  if (existing) return;

  const container = document.createElement("div");
  container.id = "aurora-bg";
  container.className = "aurora-bg";

  for (let i = 1; i <= 3; i++) {
    const blob = document.createElement("div");
    blob.className = `aurora-blob aurora-blob-${i}`;
    container.appendChild(blob);
  }

  document.body.insertBefore(container, document.body.firstChild);
}
