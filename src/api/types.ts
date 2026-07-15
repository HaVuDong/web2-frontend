export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type User = {
  id?: string;
  email: string;
  name: string;
  role: "OWNER" | "TENANT";
  active?: boolean;
};

export type JwtResponse = {
  token: string;
  type: "Bearer";
  email: string;
  name: string;
  role: "OWNER" | "TENANT";
};

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
export type TenantStatus = "ACTIVE" | "LEFT";
export type ContractStatus = "ACTIVE" | "EXPIRED" | "TERMINATED" | "PENDING";
export type InvoiceStatus = "UNPAID" | "PAID" | "PARTIAL" | "OVERDUE" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH";
export type MaintenanceStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";

export type Property = {
  id: string;
  name: string;
  address: string;
  description?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type Room = {
  id: string;
  propertyId: string;
  roomNumber: string;
  floor?: number;
  area?: number;
  baseRent?: number;
  deposit?: number;
  maxTenants?: number;
  status: RoomStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type Tenant = {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  identityNumber?: string;
  dateOfBirth?: string;
  permanentAddress?: string;
  currentRoomId?: string;
  status: TenantStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type Contract = {
  id: string;
  roomId: string;
  tenantIds: string[];
  startDate: string;
  endDate: string;
  monthlyRent: number;
  deposit: number;
  paymentDueDay: number;
  status: ContractStatus;
  terminatedAt?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type ServicePrice = {
  id: string;
  propertyId: string;
  electricityPrice: number;
  waterPrice: number;
  wifiFee: number;
  garbageFee: number;
  parkingFee: number;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type MeterReading = {
  id: string;
  roomId: string;
  month: number;
  year: number;
  electricityOld: number;
  electricityNew: number;
  waterOld: number;
  waterNew: number;
  note?: string;
  submittedByTenantId?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type Invoice = {
  id: string;
  roomId: string;
  contractId: string;
  month: number;
  year: number;
  rentAmount: number;
  electricityOld: number;
  electricityNew: number;
  electricityUsage: number;
  electricityPrice: number;
  electricityAmount: number;
  waterOld: number;
  waterNew: number;
  waterUsage: number;
  waterPrice: number;
  waterAmount: number;
  wifiFee: number;
  garbageFee: number;
  parkingFee: number;
  otherFees: number;
  discountAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate?: string;
  paidAt?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type MonthlyInvoiceGenerationResponse = {
  createdInvoices: Invoice[];
  skippedRooms: string[];
  errors: string[];
};

export type Payment = {
  id: string;
  invoiceId: string;
  provider: "PAYOS" | "CASH" | "BANK_TRANSFER";
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  checkoutUrl?: string;
  qrCode?: string;
  payosTransactionId?: string;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type PaymentLinkResponse = {
  paymentId: string;
  invoiceId: string;
  orderCode: number;
  amount: number;
  status: PaymentStatus;
  checkoutUrl?: string;
  qrCode?: string;
};

export type PaymentUpdatedData = {
  paymentId: string;
  invoiceId: string;
  paymentStatus: PaymentStatus;
  invoiceStatus: InvoiceStatus | null;
  paidAt?: string | null;
};

export type RealtimeEvent<T> = {
  type: string;
  occurredAt: string;
  data: T;
};

export type DashboardSummary = {
  totalRooms: number;
  occupiedRooms: number;
  availableRooms: number;
  maintenanceRooms: number;
  monthlyExpectedRevenue: number;
  monthlyPaidRevenue: number;
  monthlyUnpaidRevenue: number;
  unpaidInvoices: number;
  pendingMaintenanceRequests: number;
};

export type DashboardRevenue = {
  month: number;
  year: number;
  expectedRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  invoiceCount: number;
  paidInvoices: number;
  unpaidInvoices: number;
};

export type DashboardDebts = {
  totalDebt: number;
  debtInvoiceCount: number;
  invoices: Invoice[];
};

export type DashboardRoomsStatus = {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  maintenanceRooms: number;
};

export type MaintenanceRequest = {
  id: string;
  roomId: string;
  tenantId?: string;
  title: string;
  description?: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  deleted?: boolean;
};

export type AuditLog = {
  id: string;
  ownerId: string;
  actorId: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  changedFields?: string[];
  requestId?: string;
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
};
