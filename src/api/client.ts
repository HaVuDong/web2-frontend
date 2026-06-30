import { Platform } from "react-native";

import { getStoredToken } from "../storage/authStorage";
import type {
  ApiResponse,
  Contract,
  DashboardDebts,
  DashboardRevenue,
  DashboardRoomsStatus,
  DashboardSummary,
  Invoice,
  JwtResponse,
  MaintenanceRequest,
  MeterReading,
  MonthlyInvoiceGenerationResponse,
  Payment,
  PaymentLinkResponse,
  Property,
  Room,
  ServicePrice,
  Tenant,
} from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  idempotencyKey?: string;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.auth !== false) {
    const token = await getStoredToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Keep the original HTTP status message when the backend returns no JSON.
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message ?? `HTTP ${response.status}`);
  }

  return payload?.data as T;
}

const toQueryString = (params: Record<string, string | number | undefined | null>) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");

  return query ? `?${query}` : "";
};

export const api = {
  login: (body: { email: string; password: string }) =>
    apiRequest<JwtResponse>("/api/auth/login", { method: "POST", body, auth: false }),
  me: () => apiRequest<import("./types").User>("/api/users/me"),

  properties: () => apiRequest<Property[]>("/api/properties"),
  createProperty: (body: Partial<Property>) => apiRequest<Property>("/api/properties", { method: "POST", body }),
  updateProperty: (id: string, body: Partial<Property>) =>
    apiRequest<Property>(`/api/properties/${id}`, { method: "PUT", body }),
  deleteProperty: (id: string) => apiRequest<void>(`/api/properties/${id}`, { method: "DELETE" }),

  rooms: (propertyId: string) => apiRequest<Room[]>(`/api/properties/${propertyId}/rooms`),
  room: (id: string) => apiRequest<Room>(`/api/rooms/${id}`),
  createRoom: (propertyId: string, body: Partial<Room>) =>
    apiRequest<Room>(`/api/properties/${propertyId}/rooms`, { method: "POST", body }),
  updateRoom: (id: string, body: Partial<Room>) => apiRequest<Room>(`/api/rooms/${id}`, { method: "PUT", body }),
  deleteRoom: (id: string) => apiRequest<void>(`/api/rooms/${id}`, { method: "DELETE" }),
  updateRoomStatus: (id: string, status: Room["status"]) =>
    apiRequest<Room>(`/api/rooms/${id}/status`, { method: "PATCH", body: { status } }),

  tenants: (params: { keyword?: string; status?: Tenant["status"] } = {}) =>
    apiRequest<Tenant[]>(`/api/tenants${toQueryString(params)}`),
  createTenant: (body: Partial<Tenant>) => apiRequest<Tenant>("/api/tenants", { method: "POST", body }),
  updateTenant: (id: string, body: Partial<Tenant>) =>
    apiRequest<Tenant>(`/api/tenants/${id}`, { method: "PUT", body }),
  markTenantLeft: (id: string) => apiRequest<void>(`/api/tenants/${id}`, { method: "DELETE" }),
  tenantsByRoom: (roomId: string) => apiRequest<Tenant[]>(`/api/rooms/${roomId}/tenants`),

  contracts: () => apiRequest<Contract[]>("/api/contracts"),
  createContract: (body: Partial<Contract>) => apiRequest<Contract>("/api/contracts", { method: "POST", body }),
  updateContract: (id: string, body: Partial<Contract>) =>
    apiRequest<Contract>(`/api/contracts/${id}`, { method: "PUT", body }),
  terminateContract: (id: string, body: { roomStatus?: Room["status"]; note?: string }) =>
    apiRequest<Contract>(`/api/contracts/${id}/terminate`, { method: "PATCH", body }),
  renewContract: (id: string, body: { newEndDate: string; monthlyRent?: number; deposit?: number; paymentDueDay?: number; note?: string }) =>
    apiRequest<Contract>(`/api/contracts/${id}/renew`, { method: "PATCH", body }),

  servicePrice: (propertyId: string) => apiRequest<ServicePrice>(`/api/properties/${propertyId}/service-prices`),
  updateServicePrice: (propertyId: string, body: Partial<ServicePrice>) =>
    apiRequest<ServicePrice>(`/api/properties/${propertyId}/service-prices`, { method: "PUT", body }),

  meterReadings: () => apiRequest<MeterReading[]>("/api/meter-readings"),
  roomMeterReadings: (roomId: string) => apiRequest<MeterReading[]>(`/api/rooms/${roomId}/meter-readings`),
  latestMeterReading: (roomId: string) => apiRequest<MeterReading>(`/api/rooms/${roomId}/latest-meter-reading`),
  createMeterReading: (body: Partial<MeterReading>) =>
    apiRequest<MeterReading>("/api/meter-readings", { method: "POST", body }),
  updateMeterReading: (id: string, body: Partial<MeterReading>) =>
    apiRequest<MeterReading>(`/api/meter-readings/${id}`, { method: "PUT", body }),
  deleteMeterReading: (id: string) => apiRequest<void>(`/api/meter-readings/${id}`, { method: "DELETE" }),

  invoices: () => apiRequest<Invoice[]>("/api/invoices"),
  generateInvoice: (body: { roomId: string; month: number; year: number; otherFees?: number; discountAmount?: number; note?: string }) =>
    apiRequest<Invoice>("/api/invoices/generate", { method: "POST", body }),
  generateMonthlyInvoices: (body: { propertyId: string; month: number; year: number }) =>
    apiRequest<MonthlyInvoiceGenerationResponse>("/api/invoices/generate-monthly", { method: "POST", body }),
  updateInvoice: (id: string, body: { otherFees?: number; discountAmount?: number; dueDate?: string; note?: string }) =>
    apiRequest<Invoice>(`/api/invoices/${id}`, { method: "PUT", body }),
  deleteInvoice: (id: string) => apiRequest<void>(`/api/invoices/${id}`, { method: "DELETE" }),
  markInvoicePaid: (id: string) => apiRequest<Invoice>(`/api/invoices/${id}/mark-paid`, { method: "PATCH" }),
  cancelInvoice: (id: string) => apiRequest<Invoice>(`/api/invoices/${id}/cancel`, { method: "PATCH" }),
  roomInvoices: (roomId: string) => apiRequest<Invoice[]>(`/api/rooms/${roomId}/invoices`),

  createPaymentLink: (invoiceId: string, idempotencyKey?: string) =>
    apiRequest<PaymentLinkResponse>(`/api/invoices/${invoiceId}/payment-link`, { method: "POST", idempotencyKey }),
  payment: (id: string) => apiRequest<Payment>(`/api/payments/${id}`),
  invoicePayments: (invoiceId: string) => apiRequest<Payment[]>(`/api/invoices/${invoiceId}/payments`),

  dashboardSummary: () => apiRequest<DashboardSummary>("/api/dashboard/summary"),
  dashboardRevenue: (params: { month?: number; year?: number } = {}) =>
    apiRequest<DashboardRevenue>(`/api/dashboard/revenue${toQueryString(params)}`),
  dashboardDebts: () => apiRequest<DashboardDebts>("/api/dashboard/debts"),
  dashboardRoomsStatus: () => apiRequest<DashboardRoomsStatus>("/api/dashboard/rooms-status"),

  maintenanceRequests: (status?: MaintenanceRequest["status"]) =>
    apiRequest<MaintenanceRequest[]>(`/api/maintenance-requests${toQueryString({ status })}`),
  createMaintenanceRequest: (body: Partial<MaintenanceRequest>) =>
    apiRequest<MaintenanceRequest>("/api/maintenance-requests", { method: "POST", body }),
  updateMaintenanceRequest: (id: string, body: Partial<MaintenanceRequest>) =>
    apiRequest<MaintenanceRequest>(`/api/maintenance-requests/${id}`, { method: "PUT", body }),
  updateMaintenanceStatus: (id: string, status: MaintenanceRequest["status"]) =>
    apiRequest<MaintenanceRequest>(`/api/maintenance-requests/${id}/status`, { method: "PATCH", body: { status } }),
  deleteMaintenanceRequest: (id: string) =>
    apiRequest<void>(`/api/maintenance-requests/${id}`, { method: "DELETE" }),
};

export function resolveNativeApiHint() {
  if (Platform.OS === "web") {
    return API_BASE_URL;
  }

  return `${API_BASE_URL} (doi sang IP LAN neu chay tren dien thoai that)`;
}

