import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  useWindowDimensions,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { z } from "zod";

import { api, API_BASE_URL, resolveNativeApiHint } from "./api/client";
import type {
  Contract,
  Invoice,
  MaintenancePriority,
  MaintenanceRequest,
  MaintenanceStatus,
  MeterReading,
  PaymentLinkResponse,
  Property,
  Room,
  RoomStatus,
  ServicePrice,
  Tenant,
  TenantStatus,
  User,
} from "./api/types";
import type { PaymentUpdatedData, RealtimeEvent } from "./api/types";
import { useAppRealtime } from "./realtime/useAppRealtime";
import { clearStoredToken, getStoredToken, saveStoredToken, clearStoredUser, getStoredUser, saveStoredUser } from "./storage/authStorage";

/* ─── UI Modules ─── */
import { colors, spacing, radius, glass, shadows, transition, formatMoney, currentMonth, currentYear } from "./ui/theme";
import { injectAuroraStyles, injectAuroraBackground } from "./ui/aurora";
import {
  AppButton, Badge, Card, ChipSelect, Field, IconButton, Notice,
  Building2, LogIn, LogOut, QrCode, RefreshCw, X,
  type IconComponent, type Tone,
  useFadeIn,
} from "./ui/components";

/* ─── Screens ─── */
import { DashboardScreen } from "./screens/DashboardScreen";
import { PropertiesRoomsScreen } from "./screens/PropertiesScreen";
import { TenantsScreen } from "./screens/TenantsScreen";
import { ContractsScreen } from "./screens/ContractsScreen";
import { ServicesMeterScreen } from "./screens/ServicesScreen";
import { BillingMaintenanceScreen } from "./screens/BillingScreen";
import { TenantDashboardScreen } from "./screens/TenantDashboardScreen";

/* ─── Icons for tabs ─── */
import {
  BarChart3, Home, Users, FileText, Bolt, Receipt,
} from "lucide-react-native";

/* ─── Inject global styles ─── */
if (Platform.OS === "web" && typeof document !== "undefined") {
  injectAuroraStyles();
  injectAuroraBackground();
}

/* ─── Tab Config ─── */
type TabKey = "dashboard" | "properties" | "tenants" | "contracts" | "services" | "billing";

const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "dashboard", label: "Dashboard", icon: BarChart3 },
  { key: "properties", label: "Nhà/Phòng", icon: Home },
  { key: "tenants", label: "Khách thuê", icon: Users },
  { key: "contracts", label: "Hợp đồng", icon: FileText },
  { key: "services", label: "Dịch vụ", icon: Bolt },
  { key: "billing", label: "Hóa đơn", icon: Receipt },
];

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

type LoginForm = z.infer<typeof loginSchema>;

import {
  emptyPropertyForm, emptyRoomForm, emptyTenantForm, emptyContractForm, emptyServiceForm, emptyMeterForm, emptyInvoiceForm, emptyMaintenanceForm,
  toNumber, valueOrUndefined, isValidEmail, isValidIsoDate, isValidMonthYear, areNonNegativeNumberStrings, addOneYear, debtIsEmpty, localizeError, confirmAction
} from "./utils";

/* ═══════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════ */
export default function BoardingHouseApp() {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const isMobile = width < 760;
  const isCompact = width < 1100;

  const [booting, setBooting] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("dashboard");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentLinkResponse | null>(null);

  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [meterForm, setMeterForm] = useState(emptyMeterForm);
  const [editingMeterId, setEditingMeterId] = useState<string | null>(null);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoiceForm);
  const [billingMode, setBillingMode] = useState<"invoices" | "maintenance">("invoices");
  const [maintenanceStatus, setMaintenanceStatus] = useState<MaintenanceStatus | "">("");
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState<string | null>(null);

  const loggedIn = Boolean(token);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6_000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    Promise.all([getStoredToken(), getStoredUser()])
      .then(([storedToken, storedUser]) => {
        setToken(storedToken);
        setUser(storedUser);
      })
      .finally(() => setBooting(false));
  }, []);

  const meQuery = useQuery({
    queryKey: ["me", token, user?.role],
    queryFn: user?.role === "TENANT" ? api.tenantMe : api.me,
    enabled: loggedIn && !!user?.role,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser((prev) => ({ ...prev, ...meQuery.data, role: prev?.role || "OWNER" } as User));
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (meQuery.isError && loggedIn) {
      clearStoredToken();
      clearStoredUser();
      setToken(null);
      setUser(null);
      setNotice("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
    }
  }, [loggedIn, meQuery.isError]);

  const propertiesQuery = useQuery({ queryKey: ["properties"], queryFn: api.properties, enabled: loggedIn && user?.role === "OWNER" });
  const properties = propertiesQuery.data ?? [];

  useEffect(() => {
    if (!selectedPropertyId && properties[0]?.id) setSelectedPropertyId(properties[0].id);
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? properties[0];

  const roomsQuery = useQuery({
    queryKey: ["rooms", selectedProperty?.id],
    queryFn: () => api.rooms(selectedProperty!.id),
    enabled: loggedIn && user?.role === "OWNER" && Boolean(selectedProperty?.id),
  });
  const rooms = roomsQuery.data ?? [];

  const tenantsQuery = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.tenants({}),
    enabled: loggedIn && user?.role === "OWNER",
  });
  const tenants = tenantsQuery.data ?? [];

  const contractsQuery = useQuery({ queryKey: ["contracts"], queryFn: api.contracts, enabled: loggedIn && user?.role === "OWNER" });
  const contracts = contractsQuery.data ?? [];

  const servicePriceQuery = useQuery({
    queryKey: ["service-price", selectedProperty?.id],
    queryFn: () => api.servicePrice(selectedProperty!.id),
    enabled: loggedIn && user?.role === "OWNER" && Boolean(selectedProperty?.id),
  });
  const servicePrice = servicePriceQuery.data;

  const meterReadingsQuery = useQuery({
    queryKey: ["meter-readings"],
    queryFn: api.meterReadings,
    enabled: loggedIn && user?.role === "OWNER",
  });
  const meterReadings = meterReadingsQuery.data ?? [];

  const invoicesQuery = useQuery({ queryKey: ["invoices"], queryFn: api.invoices, enabled: loggedIn });
  const invoices = invoicesQuery.data ?? [];

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance", maintenanceStatus],
    queryFn: () => api.maintenanceRequests(maintenanceStatus || undefined),
    enabled: loggedIn && user?.role === "OWNER",
  });
  const maintenanceRequests = maintenanceQuery.data ?? [];

  const dashboardSummaryQuery = useQuery({ queryKey: ["dashboard-summary"], queryFn: api.dashboardSummary, enabled: loggedIn && user?.role === "OWNER" });
  const dashboardRevenueQuery = useQuery({
    queryKey: ["dashboard-revenue", currentMonth, currentYear],
    queryFn: () => api.dashboardRevenue({ month: currentMonth, year: currentYear }),
    enabled: loggedIn && user?.role === "OWNER",
  });
  const dashboardDebtsQuery = useQuery({ queryKey: ["dashboard-debts"], queryFn: api.dashboardDebts, enabled: loggedIn && user?.role === "OWNER" });
  const dashboardRoomsQuery = useQuery({ queryKey: ["dashboard-rooms"], queryFn: api.dashboardRoomsStatus, enabled: loggedIn && user?.role === "OWNER" });

  const tenantMeQuery = useQuery({ queryKey: ["tenant-me"], queryFn: api.tenantMe, enabled: loggedIn && user?.role === "TENANT" });
  const tenantInvoicesQuery = useQuery({ queryKey: ["tenant-invoices"], queryFn: api.tenantInvoices, enabled: loggedIn && user?.role === "TENANT" });
  const tenantRentalInfoQuery = useQuery({ queryKey: ["tenant-rental-info"], queryFn: api.tenantRentalInfo, enabled: loggedIn && user?.role === "TENANT" });

  const syncPaymentQueries = useCallback(() => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-revenue"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-debts"] }),
    ]).then(() => undefined);
  }, [queryClient]);

  const handlePaymentUpdated = useCallback(
    (event: RealtimeEvent<PaymentUpdatedData>) => {
      const payment = event.data;
      queryClient.setQueryData<Invoice[]>(["invoices"], (current) =>
        current?.map((inv) =>
          inv.id === payment.invoiceId
            ? { ...inv, status: payment.invoiceStatus ?? inv.status, paidAt: payment.paidAt ?? inv.paidAt }
            : inv,
        ),
      );
      setSelectedPayment((current) =>
        current?.paymentId === payment.paymentId ? { ...current, status: payment.paymentStatus } : current,
      );
      if (payment.paymentStatus === "PAID") setNotice("Hóa đơn đã được thanh toán.");
      void syncPaymentQueries();
    },
    [queryClient, syncPaymentQueries],
  );

  const invalidateAll = async () => { await queryClient.invalidateQueries(); };

  useAppRealtime({
    enabled: loggedIn,
    token,
    onPaymentUpdated: handlePaymentUpdated,
    onGlobalUpdate: invalidateAll,
    onSync: syncPaymentQueries,
  });

  useEffect(() => {
    if (servicePrice) {
      setServiceForm({
        electricityPrice: String(servicePrice.electricityPrice ?? 0),
        waterPrice: String(servicePrice.waterPrice ?? 0),
        wifiFee: String(servicePrice.wifiFee ?? 0),
        garbageFee: String(servicePrice.garbageFee ?? 0),
        parkingFee: String(servicePrice.parkingFee ?? 0),
      });
    }
  }, [servicePrice]);


  const roomName = (roomId?: string) => rooms.find((r) => r.id === roomId)?.roomNumber ?? roomId ?? "-";
  const tenantName = (tenantId?: string) => tenants.find((t) => t.id === tenantId)?.fullName ?? tenantId ?? "-";

  const notifyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    setNotice(localizeError(message));
  };

  /* ─── Mutations ─── */
  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: async (response) => {
      const userPayload = { email: response.email, name: response.name, role: response.role };
      await saveStoredToken(response.token);
      await saveStoredUser(userPayload);
      setToken(response.token);
      setUser(userPayload as any);
      setActiveTab("dashboard");
      setNotice("Đăng nhập thành công.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdatePropertyMutation = useMutation({
    mutationFn: () => {
      const body = { name: propertyForm.name.trim(), address: propertyForm.address.trim(), description: propertyForm.description.trim() };
      if (!body.name) throw new Error("Vui lòng nhập tên nhà trọ.");
      if (!body.address) throw new Error("Vui lòng nhập địa chỉ nhà trọ.");
      return editingPropertyId ? api.updateProperty(editingPropertyId, body) : api.createProperty(body);
    },
    onSuccess: async (property) => {
      setSelectedPropertyId(property.id);
      setPropertyForm(emptyPropertyForm);
      setEditingPropertyId(null);
      setNotice("Đã lưu nhà trọ.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      const propertyRooms = await api.rooms(id);
      if (propertyRooms.length > 0) throw new Error("Không thể xóa nhà trọ khi vẫn còn phòng. Hãy xóa các phòng trước.");
      return api.deleteProperty(id);
    },
    onSuccess: async () => { setSelectedPropertyId(""); setNotice("Đã xóa nhà trọ."); await invalidateAll(); },
    onError: notifyError,
  });

  const createOrUpdateRoomMutation = useMutation({
    mutationFn: () => {
      const body = {
        roomNumber: roomForm.roomNumber.trim(), floor: toNumber(roomForm.floor),
        area: toNumber(roomForm.area), baseRent: toNumber(roomForm.baseRent),
        deposit: toNumber(roomForm.deposit), maxTenants: toNumber(roomForm.maxTenants),
        status: roomForm.status, note: roomForm.note.trim(),
      };
      if (!body.roomNumber) throw new Error("Vui lòng nhập số phòng.");
      if (body.floor < 0 || body.area < 0 || body.baseRent < 0 || body.deposit < 0 || !Number.isInteger(body.maxTenants) || body.maxTenants < 1)
        throw new Error("Thông tin phòng không hợp lệ. Số người phải từ 1 và các giá trị khác không được âm.");
      const duplicateRoom = rooms.some((r) => r.id !== editingRoomId && r.roomNumber.trim().toLowerCase() === body.roomNumber.toLowerCase());
      if (duplicateRoom) throw new Error("Số phòng đã tồn tại trong nhà trọ này.");
      if (editingRoomId) {
        const hasActiveContract = contracts.some((c) => c.roomId === editingRoomId && c.status === "ACTIVE");
        if (hasActiveContract && body.status !== "OCCUPIED")
          throw new Error("Phòng đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi trạng thái.");
        return api.updateRoom(editingRoomId, body);
      }
      if (!selectedProperty?.id) throw new Error("Chưa chọn nhà trọ.");
      return api.createRoom(selectedProperty.id, body);
    },
    onSuccess: async () => { setRoomForm(emptyRoomForm); setEditingRoomId(null); setNotice("Đã lưu phòng."); await invalidateAll(); },
    onError: notifyError,
  });

  const updateRoomStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoomStatus }) => {
      const hasActiveContract = contracts.some((c) => c.roomId === id && c.status === "ACTIVE");
      if (hasActiveContract && status !== "OCCUPIED")
        throw new Error("Phòng đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi trạng thái.");
      return api.updateRoomStatus(id, status);
    },
    onSuccess: async () => { setNotice("Đã cập nhật trạng thái phòng."); await invalidateAll(); },
    onError: notifyError,
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => {
      if (contracts.some((c) => c.roomId === id && c.status === "ACTIVE"))
        throw new Error("Không thể xóa phòng đang có hợp đồng hoạt động.");
      return api.deleteRoom(id);
    },
    onSuccess: async () => { setNotice("Đã xóa phòng."); await invalidateAll(); },
    onError: notifyError,
  });



  const updateServicePriceMutation = useMutation({
    mutationFn: () => {
      if (!selectedProperty?.id) throw new Error("Chưa chọn nhà trọ.");
      const body = {
        electricityPrice: toNumber(serviceForm.electricityPrice), waterPrice: toNumber(serviceForm.waterPrice),
        wifiFee: toNumber(serviceForm.wifiFee), garbageFee: toNumber(serviceForm.garbageFee),
        parkingFee: toNumber(serviceForm.parkingFee),
      };
      if (Object.values(body).some((v) => v < 0)) throw new Error("Giá dịch vụ không được âm.");
      return api.updateServicePrice(selectedProperty.id, body);
    },
    onSuccess: async () => { setNotice("Đã cập nhật giá dịch vụ."); await invalidateAll(); },
    onError: notifyError,
  });

  const createOrUpdateMeterMutation = useMutation({
    mutationFn: () => {
      const roomId = meterForm.roomId;
      if (!roomId && !editingMeterId) throw new Error("Vui lòng chọn phòng.");
      const month = toNumber(meterForm.month); const year = toNumber(meterForm.year);
      const electricityOld = toNumber(meterForm.electricityOld); const electricityNew = toNumber(meterForm.electricityNew);
      const waterOld = toNumber(meterForm.waterOld); const waterNew = toNumber(meterForm.waterNew);
      if (!isValidMonthYear(month, year)) throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      if ([electricityOld, electricityNew, waterOld, waterNew].some((v) => v < 0))
        throw new Error("Chỉ số điện nước không được âm.");
      if (electricityNew < electricityOld || waterNew < waterOld)
        throw new Error("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      const duplicateReading = meterReadings.some(
        (r) => r.id !== editingMeterId && r.roomId === roomId && r.month === month && r.year === year,
      );
      if (duplicateReading) throw new Error("Phòng đã có chỉ số điện nước trong tháng này.");
      const body = { roomId, month, year, electricityOld, electricityNew, waterOld, waterNew, note: valueOrUndefined(meterForm.note) };
      if (editingMeterId) {
        const originalReading = meterReadings.find((r) => r.id === editingMeterId);
        const hasInvoice = originalReading && invoices.some(
          (inv) => inv.roomId === originalReading.roomId && inv.month === originalReading.month && inv.year === originalReading.year,
        );
        if (hasInvoice) throw new Error("Không thể sửa chỉ số vì tháng này đã xuất hóa đơn. Hãy xóa hóa đơn trước.");
        const { roomId: _roomId, ...updateBody } = body;
        return api.updateMeterReading(editingMeterId, updateBody);
      }
      return api.createMeterReading(body);
    },
    onSuccess: async () => { setMeterForm(emptyMeterForm); setEditingMeterId(null); setNotice("Đã lưu chỉ số điện nước."); await invalidateAll(); },
    onError: notifyError,
  });

  const deleteMeterMutation = useMutation({
    mutationFn: (id: string) => {
      const reading = meterReadings.find((r) => r.id === id);
      const hasInvoice = reading && invoices.some(
        (inv) => inv.roomId === reading.roomId && inv.month === reading.month && inv.year === reading.year,
      );
      if (hasInvoice) throw new Error("Không thể xóa chỉ số vì tháng này đã xuất hóa đơn. Hãy xóa hóa đơn trước.");
      return api.deleteMeterReading(id);
    },
    onSuccess: async () => { setNotice("Đã xóa chỉ số."); await invalidateAll(); },
    onError: notifyError,
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: () => {
      const roomId = invoiceForm.roomId;
      if (!roomId) throw new Error("Vui lòng chọn phòng đang thuê.");
      const month = toNumber(invoiceForm.month); const year = toNumber(invoiceForm.year);
      const otherFees = toNumber(invoiceForm.otherFees); const discountAmount = toNumber(invoiceForm.discountAmount);
      if (!isValidMonthYear(month, year)) throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      if (otherFees < 0 || discountAmount < 0) throw new Error("Phí khác và giảm giá không được âm.");
      if (invoices.some((inv) => inv.roomId === roomId && inv.month === month && inv.year === year))
        throw new Error("Phòng đã có hóa đơn trong tháng này.");
      if (!meterReadings.some((r) => r.roomId === roomId && r.month === month && r.year === year))
        throw new Error("Chưa có chỉ số điện nước của phòng trong tháng này.");
      if (!contracts.some((c) => c.roomId === roomId && c.status === "ACTIVE"))
        throw new Error("Phòng chưa có hợp đồng hoạt động.");
      if (!servicePrice) throw new Error("Nhà trọ chưa cấu hình giá dịch vụ.");
      return api.generateInvoice({ roomId, month, year, otherFees, discountAmount, note: valueOrUndefined(invoiceForm.note) });
    },
    onSuccess: async () => { setNotice("Đã tạo hóa đơn."); await invalidateAll(); },
    onError: notifyError,
  });

  const generateMonthlyMutation = useMutation({
    mutationFn: () => {
      if (!selectedProperty?.id) throw new Error("Chưa chọn nhà trọ.");
      const month = toNumber(invoiceForm.month); const year = toNumber(invoiceForm.year);
      if (!isValidMonthYear(month, year)) throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      if (occupiedRooms.length === 0) throw new Error("Nhà trọ chưa có phòng đang thuê để tạo hóa đơn.");
      return api.generateMonthlyInvoices({ propertyId: selectedProperty.id, month, year });
    },
    onSuccess: async (result) => {
      const errorDetails = result.errors && result.errors.length > 0 
        ? `\nChi tiết: ${result.errors.map(e => localizeError(e)).join("; ")}` 
        : "";
      setNotice(`Đã tạo ${result.createdInvoices.length} hóa đơn, bỏ qua ${result.skippedRooms.length} phòng.${errorDetails}`);
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: ({ invoiceId, idempotencyKey }: { invoiceId: string; idempotencyKey: string }) =>
      api.createPaymentLink(invoiceId, idempotencyKey),
    onSuccess: async (payment) => { setSelectedPayment(payment); setNotice("Đã tạo link PayOS."); await invalidateAll(); },
    onError: notifyError,
  });

  const changePasswordMutation = useMutation({
    mutationFn: api.changePassword,
    onSuccess: () => { setNotice("Đã đổi mật khẩu thành công."); },
    onError: notifyError,
  });

  const invoiceStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "paid" | "cancel" }) =>
      action === "paid" ? api.markInvoicePaid(id) : api.cancelInvoice(id),
    onSuccess: async () => { setNotice("Đã cập nhật hóa đơn."); await invalidateAll(); },
    onError: notifyError,
  });

  const createOrUpdateMaintenanceMutation = useMutation({
    mutationFn: () => {
      const roomId = maintenanceForm.roomId;
      if (!roomId) throw new Error("Vui lòng chọn phòng.");
      const body = {
        roomId, tenantId: valueOrUndefined(maintenanceForm.tenantId),
        title: maintenanceForm.title.trim(), description: valueOrUndefined(maintenanceForm.description),
        priority: maintenanceForm.priority,
      };
      if (!body.title) throw new Error("Vui lòng nhập tiêu đề bảo trì.");
      if (editingMaintenanceId) {
        const originalReq = maintenanceRequests.find((r) => r.id === editingMaintenanceId);
        if (originalReq && (originalReq.status === "DONE" || originalReq.status === "CANCELLED"))
          throw new Error("Không thể cập nhật yêu cầu bảo trì đã hoàn tất hoặc bị hủy.");
        const { roomId: _roomId, ...updateBody } = body;
        return api.updateMaintenanceRequest(editingMaintenanceId, updateBody);
      }
      return api.createMaintenanceRequest(body);
    },
    onSuccess: async () => { setMaintenanceForm(emptyMaintenanceForm); setEditingMaintenanceId(null); setNotice("Đã lưu yêu cầu bảo trì."); await invalidateAll(); },
    onError: notifyError,
  });

  const maintenanceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) => api.updateMaintenanceStatus(id, status),
    onSuccess: async () => { setNotice("Đã cập nhật bảo trì."); await invalidateAll(); },
    onError: notifyError,
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: api.deleteMaintenanceRequest,
    onSuccess: async () => { setNotice("Đã xóa yêu cầu bảo trì."); await invalidateAll(); },
    onError: notifyError,
  });

  const loading = propertiesQuery.isLoading || roomsQuery.isLoading || dashboardSummaryQuery.isLoading ||
    tenantsQuery.isLoading || contractsQuery.isLoading || invoicesQuery.isLoading;

  const screenTitle = tabs.find((t) => t.key === activeTab)?.label ?? "Dashboard";

  const layoutStyle = useMemo(
    () => [styles.appShell, isMobile ? styles.mobileShell : styles.desktopShell],
    [isMobile],
  );

  /* ─── Boot Screen ─── */
  if (booting) {
    return (
      <View style={styles.bootScreen}>
        <View style={styles.bootLoader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
        <Text style={styles.bootText}>Đang khởi động...</Text>
      </View>
    );
  }

  /* ─── Login Screen ─── */
  if (!token) {
    return (
      <LoginScreen
        onSubmit={(body) => loginMutation.mutate(body)}
        isLoading={loginMutation.isPending}
        notice={notice}
        clearNotice={() => setNotice(null)}
      />
    );
  }

  /* ─── Main App ─── */
  return (
    <View style={layoutStyle}>
      {!isMobile ? <NavRail activeTab={activeTab} onChange={setActiveTab} user={user} onLogout={logout} /> : null}
      <View style={styles.mainPane}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{screenTitle}</Text>
            <Text style={styles.pageSub} numberOfLines={1}>
              {user?.role === "TENANT" ? "Cổng thông tin Khách thuê" : (selectedProperty?.name ?? "Chưa có nhà trọ")} · {API_BASE_URL}
            </Text>
          </View>
          <View style={styles.topActions}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            <IconButton icon={RefreshCw} onPress={() => invalidateAll()} />
            <IconButton icon={LogOut} onPress={logout} tone="danger" />
          </View>
        </View>

        {notice ? <Notice text={notice} onClose={() => setNotice(null)} /> : null}

        {properties.length > 0 && user?.role === "OWNER" && (
          <View style={{ paddingHorizontal: isMobile ? spacing.md : spacing.xl, paddingTop: isMobile ? spacing.md : spacing.xl, paddingBottom: 0 }}>
            <ChipSelect
              label="🏠 Nhà trọ đang quản lý:"
              value={selectedPropertyId ?? ""}
              options={properties.map((p) => ({ label: p.name, value: p.id }))}
              onChange={(id) => { setNotice(null); setSelectedPropertyId(id); }}
            />
          </View>
        )}

        <ScrollView contentContainerStyle={[styles.content, isMobile && styles.mobileContent]}>
          {user?.role === "TENANT" ? (
            <TenantDashboardScreen
              tenant={tenantMeQuery.data}
              invoices={tenantInvoicesQuery.data ?? []}
              rentalInfo={tenantRentalInfoQuery.data}
              isMobile={isMobile}
              onPay={(id) =>
                createPaymentLinkMutation.mutate({
                  invoiceId: id,
                  idempotencyKey: `tenant-pay-${id}-${Date.now()}`,
                })
              }
              onChangePassword={(oldPw, newPw) => changePasswordMutation.mutate({ oldPassword: oldPw, newPassword: newPw })}
              isChangingPassword={changePasswordMutation.isPending}
            />
          ) : activeTab === "dashboard" ? (
            <DashboardScreen
              summary={dashboardSummaryQuery.data}
              revenue={dashboardRevenueQuery.data}
              roomsStatus={dashboardRoomsQuery.data}
              debts={dashboardDebtsQuery.data}
              maintenanceRequests={maintenanceRequests}
              invoices={invoices}
              roomName={roomName}
              isMobile={isMobile}
            />
          ) : null}

          {activeTab === "properties" ? (
            <PropertiesRoomsScreen
              properties={properties} rooms={rooms} contracts={contracts}
              selectedPropertyId={selectedProperty?.id ?? ""}
              onSelectProperty={(id) => { setNotice(null); setSelectedPropertyId(id); }}
              propertyForm={propertyForm}
              setPropertyForm={(form) => { setNotice(null); setPropertyForm(form); }}
              editingPropertyId={editingPropertyId}
              onEditProperty={(p) => { setNotice(null); setEditingPropertyId(p.id); setPropertyForm({ name: p.name, address: p.address, description: p.description ?? "" }); }}
              onCancelPropertyEdit={() => { setNotice(null); setEditingPropertyId(null); setPropertyForm(emptyPropertyForm); }}
              onSaveProperty={() => createOrUpdatePropertyMutation.mutate()}
              onDeleteProperty={(id) => confirmAction("Xóa nhà trọ", "Bạn có chắc chắn muốn xóa nhà trọ này không?", () => deletePropertyMutation.mutate(id))}
              roomForm={roomForm}
              setRoomForm={(form) => { setNotice(null); setRoomForm(form); }}
              editingRoomId={editingRoomId}
              onEditRoom={(room) => { setNotice(null); setEditingRoomId(room.id); setRoomForm({ roomNumber: room.roomNumber, floor: String(room.floor ?? 0), area: String(room.area ?? 0), baseRent: String(room.baseRent ?? 0), deposit: String(room.deposit ?? 0), maxTenants: String(room.maxTenants ?? 1), status: room.status, note: room.note ?? "" }); }}
              onCancelRoomEdit={() => { setNotice(null); setEditingRoomId(null); setRoomForm(emptyRoomForm); }}
              onSaveRoom={() => createOrUpdateRoomMutation.mutate()}
              onDeleteRoom={(id) => confirmAction("Xóa phòng", "Bạn có chắc chắn muốn xóa phòng này không?", () => deleteRoomMutation.mutate(id))}
              onUpdateRoomStatus={(id, status) => updateRoomStatusMutation.mutate({ id, status })}
              isCompact={isCompact}
            />
          ) : null}

          {activeTab === "tenants" ? (
            <TenantsScreen
              rooms={rooms} contracts={contracts}
              setNotice={setNotice}
            />
          ) : null}

          {activeTab === "contracts" ? (
            <ContractsScreen
              contracts={contracts} rooms={rooms} tenants={tenants}
              setNotice={setNotice}
            />
          ) : null}

          {activeTab === "services" ? (
            <ServicesMeterScreen
              selectedProperty={selectedProperty} rooms={rooms} invoices={invoices}
              servicePrice={servicePrice}
              serviceForm={serviceForm} setServiceForm={(form) => { setNotice(null); setServiceForm(form); }}
              onSaveService={() => updateServicePriceMutation.mutate()}
              meterReadings={meterReadings}
              meterForm={meterForm} setMeterForm={(form) => { setNotice(null); setMeterForm(form); }}
              editingMeterId={editingMeterId}
              onSaveMeter={() => createOrUpdateMeterMutation.mutate()}
              onEditMeter={(r) => { setNotice(null); setEditingMeterId(r.id); setMeterForm({ roomId: r.roomId, month: String(r.month), year: String(r.year), electricityOld: String(r.electricityOld), electricityNew: String(r.electricityNew), waterOld: String(r.waterOld), waterNew: String(r.waterNew), note: r.note ?? "" }); }}
              onCancelMeter={() => { setNotice(null); setEditingMeterId(null); setMeterForm(emptyMeterForm); }}
              onDeleteMeter={(id) => confirmAction("Xóa chỉ số", "Bạn có chắc chắn muốn xóa chỉ số điện nước này?", () => deleteMeterMutation.mutate(id))}
              roomName={roomName}
              isSavingService={updateServicePriceMutation.isPending}
              isSavingMeter={createOrUpdateMeterMutation.isPending}
            />
          ) : null}

          {activeTab === "billing" ? (
            <BillingMaintenanceScreen
              mode={billingMode} setMode={(m) => { setNotice(null); setBillingMode(m); }}
              rooms={rooms} tenants={tenants} contracts={contracts} meterReadings={meterReadings}
              hasServicePrice={Boolean(servicePrice)}
              invoices={invoices}
              invoiceForm={invoiceForm} setInvoiceForm={(form) => { setNotice(null); setInvoiceForm(form); }}
              onGenerateInvoice={() => generateInvoiceMutation.mutate()}
              onGenerateMonthly={() => generateMonthlyMutation.mutate()}
              isGeneratingMonthly={generateMonthlyMutation.isPending}
              onCreatePayment={(id) => createPaymentLinkMutation.mutate({ invoiceId: id, idempotencyKey: crypto.randomUUID() })}
              onInvoiceStatus={(id, action) => {
                if (action === "cancel") {
                  confirmAction("Hủy hóa đơn", "Bạn có chắc chắn muốn hủy hóa đơn này?", () => invoiceStatusMutation.mutate({ id, action }));
                } else {
                  invoiceStatusMutation.mutate({ id, action });
                }
              }}
              maintenanceRequests={maintenanceRequests}
              maintenanceStatus={maintenanceStatus} setMaintenanceStatus={setMaintenanceStatus}
              maintenanceForm={maintenanceForm} setMaintenanceForm={(form) => { setNotice(null); setMaintenanceForm(form); }}
              editingMaintenanceId={editingMaintenanceId}
              onSaveMaintenance={() => createOrUpdateMaintenanceMutation.mutate()}
              onEditMaintenance={(r) => { setNotice(null); setEditingMaintenanceId(r.id); setMaintenanceForm({ roomId: r.roomId, tenantId: r.tenantId ?? "", title: r.title, description: r.description ?? "", priority: r.priority }); }}
              onCancelMaintenance={() => { setNotice(null); setEditingMaintenanceId(null); setMaintenanceForm(emptyMaintenanceForm); }}
              onUpdateMaintenanceStatus={(id, status) => maintenanceStatusMutation.mutate({ id, status })}
              onDeleteMaintenance={(id) => confirmAction("Xóa yêu cầu", "Xác nhận xóa yêu cầu bảo trì này?", () => deleteMaintenanceMutation.mutate(id))}
              roomName={roomName} tenantName={tenantName}
              isGeneratingInvoice={generateInvoiceMutation.isPending}
              isSavingMaintenance={createOrUpdateMaintenanceMutation.isPending}
            />
          ) : null}
        </ScrollView>

        {isMobile ? <BottomNav activeTab={activeTab} onChange={setActiveTab} user={user} /> : null}
      </View>

      <PaymentModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
    </View>
  );

  async function logout() {
    await clearStoredToken();
    setToken(null);
    setUser(null);
    setNotice(null);
    queryClient.clear();
  }
}

/* ═══════════════════════════════════════════════
   LOGIN SCREEN
   ═══════════════════════════════════════════════ */
function LoginScreen({
  onSubmit, isLoading, notice, clearNotice,
}: {
  onSubmit: (body: LoginForm) => void;
  isLoading: boolean;
  notice: string | null;
  clearNotice: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const fadeIn = useFadeIn(100);

  return (
    <View style={styles.loginWrap}>
      <Animated.View style={[styles.loginCard, fadeIn]}>
        <View style={styles.loginLogo}>
          <Building2 color="#fff" size={26} strokeWidth={2.5} />
        </View>
        <Text style={styles.loginTitle}>QL Trọ Manager</Text>
        <Text style={styles.loginSub}>Đăng nhập Chủ trọ / Khách thuê</Text>
        {notice ? <Notice text={notice} onClose={clearNotice} /> : null}
        <Controller
          name="email"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Field label="Email" value={value} onChangeText={onChange} autoCapitalize="none" keyboardType="email-address" error={formState.errors.email?.message} />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Field label="Mật khẩu" value={value} onChangeText={onChange} secureTextEntry error={formState.errors.password?.message} />
          )}
        />
        <AppButton
          label={isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
          icon={LogIn}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          full
        />
        <Text style={styles.loginHint}>{resolveNativeApiHint()}</Text>
      </Animated.View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   NAV RAIL (Desktop sidebar)
   ═══════════════════════════════════════════════ */
function NavRail({
  activeTab, onChange, user, onLogout,
}: {
  activeTab: TabKey; onChange: (tab: TabKey) => void;
  user: User | null; onLogout: () => void;
}) {
  return (
    <View style={styles.navRail}>
      <View style={styles.railLogo}>
        <Building2 color="#fff" size={22} strokeWidth={2.5} />
      </View>
      {user?.role === "OWNER" && tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.railItem, active && styles.railItemActive]}
          >
            {active && <View style={styles.railActiveIndicator} />}
            <Icon color={active ? colors.primaryLight : colors.faint} size={20} strokeWidth={active ? 2.5 : 2} />
            <Text style={[styles.railLabel, active && styles.railLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.railSpacer} />
      <View style={styles.railUserBlock}>
        <View style={styles.railAvatar}>
          <Text style={styles.railAvatarText}>{(user?.name ?? "O")[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.railUser} numberOfLines={1}>{user?.name ?? "Owner"}</Text>
      </View>
      <IconButton icon={LogOut} onPress={onLogout} tone="danger" />
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BOTTOM NAV (Mobile)
   ═══════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════
   BOTTOM NAV (Mobile)
   ═══════════════════════════════════════════════ */
function BottomNav({ activeTab, onChange, user }: { activeTab: TabKey; onChange: (tab: TabKey) => void; user: User | null }) {
  if (user?.role !== "OWNER") return null;

  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.bottomItem} onPress={() => onChange(tab.key)}>
            <Icon color={active ? colors.primaryLight : colors.faint} size={20} strokeWidth={active ? 2.5 : 2} />
            {active && <View style={styles.bottomDot} />}
            <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   PAYMENT MODAL
   ═══════════════════════════════════════════════ */
function PaymentModal({ payment, onClose }: { payment: PaymentLinkResponse | null; onClose: () => void }) {
  return (
    <Modal visible={Boolean(payment)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PayOS</Text>
            <IconButton icon={X} onPress={onClose} />
          </View>
          <View style={styles.qrWrap}>
            {payment?.qrCode ? (
              <QRCode value={payment.qrCode} size={180} backgroundColor="#ffffff" />
            ) : (
              <QrCode color={colors.accent} size={96} />
            )}
          </View>
          <Text style={styles.modalAmount}>{formatMoney(payment?.amount)}</Text>
          <View style={styles.paymentStatus}>
            <Badge
              label={payment?.status ?? "PENDING"}
              tone={payment?.status === "PAID" ? "green" : payment?.status === "PENDING" ? "amber" : "gray"}
            />
          </View>
          <Text style={styles.modalLink} numberOfLines={2}>
            {payment?.checkoutUrl ?? "Không có link"}
          </Text>
          <View style={styles.modalActions}>
            <AppButton
              label="Mở link"
              icon={QrCode}
              disabled={!payment?.checkoutUrl}
              onPress={() => { if (payment?.checkoutUrl) Linking.openURL(payment.checkoutUrl); }}
            />
            <AppButton label="Đóng" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const styles = StyleSheet.create({
  appShell: { flex: 1, backgroundColor: colors.bg },
  desktopShell: { flexDirection: "row" },
  mobileShell: { flexDirection: "column" },

  /* Boot */
  bootScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg, backgroundColor: colors.bg },
  bootLoader: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  bootText: { color: colors.muted, fontSize: 14, fontWeight: "600" },

  /* Login */
  loginWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing.xl, backgroundColor: colors.bg,
  },
  loginCard: {
    width: "100%", maxWidth: 360, padding: 32, borderWidth: 1,
    borderColor: colors.border, borderRadius: radius.xl,
    backgroundColor: colors.card, gap: spacing.lg,
    ...(glass.medium as any),
    ...(shadows.lg as any),
  },
  loginLogo: {
    width: 56, height: 56, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary,
    ...(Platform.OS === "web" ? { boxShadow: "0 4px 16px rgba(124,58,237,0.4)" } : {}),
  },
  loginTitle: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  loginSub: { color: colors.muted, fontSize: 14 },
  loginHint: { color: colors.faint, fontSize: 11, textAlign: "center" },

  /* Nav Rail */
  navRail: {
    width: 230, padding: spacing.lg, gap: spacing.xs,
    borderRightWidth: 1, borderRightColor: colors.border,
    backgroundColor: "rgba(6, 8, 15, 0.8)",
    ...(glass.medium as any),
  },
  railLogo: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, marginBottom: spacing.xl,
    ...(Platform.OS === "web" ? { boxShadow: "0 4px 16px rgba(124,58,237,0.35)" } : {}),
  },
  railItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: radius.sm, position: "relative", overflow: "hidden",
    ...(Platform.OS === "web" ? { transition: "all 0.2s ease" } : {}),
  },
  railItemActive: {
    backgroundColor: colors.primarySoft,
  },
  railActiveIndicator: {
    position: "absolute", left: 0, top: 6, bottom: 6,
    width: 3, borderRadius: 2, backgroundColor: colors.primary,
  },
  railLabel: { color: colors.faint, fontSize: 13, fontWeight: "600" },
  railLabelActive: { color: colors.text },
  railSpacer: { flex: 1 },
  railUserBlock: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.sm, paddingHorizontal: spacing.sm,
  },
  railAvatar: {
    width: 32, height: 32, borderRadius: radius.full,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  railAvatarText: { color: colors.primaryLight, fontSize: 14, fontWeight: "700" },
  railUser: { color: colors.muted, fontSize: 12, flex: 1 },

  /* Main */
  mainPane: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    minHeight: 72, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md,
  },
  topActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  titleBlock: { flex: 1, minWidth: 0 },
  pageTitle: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  pageSub: { color: colors.faint, fontSize: 12, marginTop: 2 },
  content: { padding: spacing.xl, paddingBottom: 80 },
  mobileContent: { padding: spacing.md, paddingBottom: 110 },
  twoColMobile: { flexDirection: "column" },

  /* Bottom Nav */
  bottomNav: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    minHeight: 72, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: "rgba(6, 8, 15, 0.9)", flexDirection: "row",
    ...(glass.heavy as any),
  },
  bottomItem: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  bottomDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.primary, marginTop: 1,
  },
  bottomLabel: { color: colors.faint, fontSize: 10, fontWeight: "700" },
  bottomLabelActive: { color: colors.primaryLight },

  /* Modal */
  modalBackdrop: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: spacing.xl, backgroundColor: "rgba(2,6,23,0.85)",
  },
  modalCard: {
    width: "100%", maxWidth: 420, padding: spacing.xl,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, gap: spacing.lg,
    ...(glass.heavy as any),
    ...(shadows.lg as any),
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  qrWrap: { alignSelf: "center", padding: spacing.lg, borderRadius: radius.md, backgroundColor: "#fff" },
  modalAmount: { color: colors.text, textAlign: "center", fontSize: 24, fontWeight: "800" },
  paymentStatus: { alignItems: "center" },
  modalLink: { color: colors.accent, textAlign: "center", fontSize: 12 },
  modalActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
} as any);
