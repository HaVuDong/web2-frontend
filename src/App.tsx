import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import {
  Banknote,
  BarChart3,
  Bolt,
  Building2,
  Check,
  ClipboardList,
  Copy,
  DoorOpen,
  Edit3,
  FileText,
  Home,
  LogIn,
  LogOut,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  KeyboardTypeOptions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Alert,
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
import { clearStoredToken, getStoredToken, saveStoredToken } from "./storage/authStorage";
import { colors, currentMonth, currentYear, formatMoney, spacing } from "./ui/theme";

if (Platform.OS === "web" && typeof document !== "undefined") {
  const fontStyle = document.createElement("style");
  fontStyle.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap');
    body, div, span, applet, object, iframe,
    h1, h2, h3, h4, h5, h6, p, blockquote, pre,
    a, abbr, acronym, address, big, cite, code,
    del, dfn, em, img, ins, kbd, q, s, samp,
    small, strike, strong, sub, sup, tt, var,
    b, u, i, center,
    dl, dt, dd, ol, ul, li,
    fieldset, form, label, legend,
    table, caption, tbody, tfoot, gethead, tr, th, td,
    article, aside, canvas, details, embed, 
    figure, figcaption, footer, header, hgroup, 
    menu, nav, output, ruby, section, summary,
    time, mark, audio, video, input, button, select, textarea {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
    }
  `;
  document.head.appendChild(fontStyle);
}

type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type TabKey = "dashboard" | "properties" | "tenants" | "contracts" | "services" | "billing";

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Hủy", style: "cancel" },
      { text: "Xác nhận", style: "destructive", onPress: onConfirm },
    ]);
  }
};

const tabs: Array<{ key: TabKey; label: string; icon: IconComponent }> = [
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

const emptyPropertyForm = {
  name: "",
  address: "",
  description: "",
};

const emptyRoomForm = {
  roomNumber: "",
  floor: "1",
  area: "20",
  baseRent: "2500000",
  deposit: "2500000",
  maxTenants: "2",
  status: "AVAILABLE" as RoomStatus,
  note: "",
};

const emptyTenantForm = {
  fullName: "",
  phone: "",
  email: "",
  identityNumber: "",
  dateOfBirth: "",
  permanentAddress: "",
  currentRoomId: "",
  status: "ACTIVE" as TenantStatus,
  note: "",
};

const emptyContractForm = {
  roomId: "",
  tenantId: "",
  startDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
  endDate: `${currentYear + 1}-${String(currentMonth).padStart(2, "0")}-01`,
  monthlyRent: "2500000",
  deposit: "2500000",
  paymentDueDay: "5",
  note: "",
};

const emptyServiceForm = {
  electricityPrice: "4000",
  waterPrice: "20000",
  wifiFee: "100000",
  garbageFee: "30000",
  parkingFee: "150000",
};

const emptyMeterForm = {
  roomId: "",
  month: String(currentMonth),
  year: String(currentYear),
  electricityOld: "0",
  electricityNew: "0",
  waterOld: "0",
  waterNew: "0",
  note: "",
};

const emptyInvoiceForm = {
  roomId: "",
  month: String(currentMonth),
  year: String(currentYear),
  otherFees: "0",
  discountAmount: "0",
  note: "",
};

const emptyMaintenanceForm = {
  roomId: "",
  tenantId: "",
  title: "",
  description: "",
  priority: "MEDIUM" as MaintenancePriority,
};

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
  const [tenantKeyword, setTenantKeyword] = useState("");
  const [tenantStatus, setTenantStatus] = useState<TenantStatus | "">("");
  const [tenantForm, setTenantForm] = useState(emptyTenantForm);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
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
    if (!notice) {
      return;
    }

    const timer = setTimeout(() => setNotice(null), 6_000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    getStoredToken()
      .then((storedToken) => {
        setToken(storedToken);
      })
      .finally(() => setBooting(false));
  }, []);

  const meQuery = useQuery({
    queryKey: ["me", token],
    queryFn: api.me,
    enabled: loggedIn,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data]);

  useEffect(() => {
    if (meQuery.isError && loggedIn) {
      clearStoredToken();
      setToken(null);
      setUser(null);
      setNotice("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
    }
  }, [loggedIn, meQuery.isError]);

  const propertiesQuery = useQuery({
    queryKey: ["properties"],
    queryFn: api.properties,
    enabled: loggedIn,
  });
  const properties = propertiesQuery.data ?? [];

  useEffect(() => {
    if (!selectedPropertyId && properties[0]?.id) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId]);

  const selectedProperty = properties.find((property) => property.id === selectedPropertyId) ?? properties[0];

  const roomsQuery = useQuery({
    queryKey: ["rooms", selectedProperty?.id],
    queryFn: () => api.rooms(selectedProperty!.id),
    enabled: loggedIn && Boolean(selectedProperty?.id),
  });
  const rooms = roomsQuery.data ?? [];

  const tenantsQuery = useQuery({
    queryKey: ["tenants", tenantKeyword, tenantStatus],
    queryFn: () => api.tenants({ keyword: tenantKeyword, status: tenantStatus || undefined }),
    enabled: loggedIn,
  });
  const tenants = tenantsQuery.data ?? [];

  const contractsQuery = useQuery({
    queryKey: ["contracts"],
    queryFn: api.contracts,
    enabled: loggedIn,
  });
  const contracts = contractsQuery.data ?? [];

  const servicePriceQuery = useQuery({
    queryKey: ["service-price", selectedProperty?.id],
    queryFn: () => api.servicePrice(selectedProperty!.id),
    enabled: loggedIn && Boolean(selectedProperty?.id),
  });
  const servicePrice = servicePriceQuery.data;

  const meterReadingsQuery = useQuery({
    queryKey: ["meter-readings"],
    queryFn: api.meterReadings,
    enabled: loggedIn,
  });
  const meterReadings = meterReadingsQuery.data ?? [];

  const invoicesQuery = useQuery({
    queryKey: ["invoices"],
    queryFn: api.invoices,
    enabled: loggedIn,
  });
  const invoices = invoicesQuery.data ?? [];

  const maintenanceQuery = useQuery({
    queryKey: ["maintenance", maintenanceStatus],
    queryFn: () => api.maintenanceRequests(maintenanceStatus || undefined),
    enabled: loggedIn,
  });
  const maintenanceRequests = maintenanceQuery.data ?? [];

  const dashboardSummaryQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: api.dashboardSummary,
    enabled: loggedIn,
  });
  const dashboardRevenueQuery = useQuery({
    queryKey: ["dashboard-revenue", currentMonth, currentYear],
    queryFn: () => api.dashboardRevenue({ month: currentMonth, year: currentYear }),
    enabled: loggedIn,
  });
  const dashboardDebtsQuery = useQuery({
    queryKey: ["dashboard-debts"],
    queryFn: api.dashboardDebts,
    enabled: loggedIn,
  });
  const dashboardRoomsQuery = useQuery({
    queryKey: ["dashboard-rooms"],
    queryFn: api.dashboardRoomsStatus,
    enabled: loggedIn,
  });

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
        current?.map((invoice) =>
          invoice.id === payment.invoiceId
            ? {
                ...invoice,
                status: payment.invoiceStatus ?? invoice.status,
                paidAt: payment.paidAt ?? invoice.paidAt,
              }
            : invoice,
        ),
      );

      setSelectedPayment((current) =>
        current?.paymentId === payment.paymentId
          ? { ...current, status: payment.paymentStatus }
          : current,
      );

      if (payment.paymentStatus === "PAID") {
        setNotice("Hóa đơn đã được thanh toán.");
      }

      void syncPaymentQueries();
    },
    [queryClient, syncPaymentQueries],
  );

  const invalidateAll = async () => {
    await queryClient.invalidateQueries();
  };

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

  const availableRooms = rooms.filter((room) => room.status === "AVAILABLE" || room.id === contractForm.roomId);
  const occupiedRooms = rooms.filter((room) => room.status === "OCCUPIED");

  const roomName = (roomId?: string) => rooms.find((room) => room.id === roomId)?.roomNumber ?? roomId ?? "-";
  const tenantName = (tenantId?: string) => tenants.find((tenant) => tenant.id === tenantId)?.fullName ?? tenantId ?? "-";

  const notifyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    setNotice(localizeError(message));
  };

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: async (response) => {
      await saveStoredToken(response.token);
      setToken(response.token);
      setUser({ email: response.email, name: response.name, role: "OWNER" });
      setActiveTab("dashboard");
      setNotice("Đăng nhập thành công.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdatePropertyMutation = useMutation({
    mutationFn: () => {
      const body = {
        name: propertyForm.name.trim(),
        address: propertyForm.address.trim(),
        description: propertyForm.description.trim(),
      };
      if (!body.name) {
        throw new Error("Vui lòng nhập tên nhà trọ.");
      }
      if (!body.address) {
        throw new Error("Vui lòng nhập địa chỉ nhà trọ.");
      }
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
      if (propertyRooms.length > 0) {
        throw new Error("Không thể xóa nhà trọ khi vẫn còn phòng. Hãy xóa các phòng trước.");
      }
      return api.deleteProperty(id);
    },
    onSuccess: async () => {
      setSelectedPropertyId("");
      setNotice("Đã xóa nhà trọ.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdateRoomMutation = useMutation({
    mutationFn: () => {
      const body = {
        roomNumber: roomForm.roomNumber.trim(),
        floor: toNumber(roomForm.floor),
        area: toNumber(roomForm.area),
        baseRent: toNumber(roomForm.baseRent),
        deposit: toNumber(roomForm.deposit),
        maxTenants: toNumber(roomForm.maxTenants),
        status: roomForm.status,
        note: roomForm.note.trim(),
      };
      if (!body.roomNumber) {
        throw new Error("Vui lòng nhập số phòng.");
      }
      if (
        body.floor < 0 ||
        body.area < 0 ||
        body.baseRent < 0 ||
        body.deposit < 0 ||
        !Number.isInteger(body.maxTenants) ||
        body.maxTenants < 1
      ) {
        throw new Error("Thông tin phòng không hợp lệ. Số người phải từ 1 và các giá trị khác không được âm.");
      }
      const duplicateRoom = rooms.some(
        (room) =>
          room.id !== editingRoomId &&
          room.roomNumber.trim().toLowerCase() === body.roomNumber.toLowerCase(),
      );
      if (duplicateRoom) {
        throw new Error("Số phòng đã tồn tại trong nhà trọ này.");
      }
      if (editingRoomId) {
        const hasActiveContract = contracts.some(
          (contract) => contract.roomId === editingRoomId && contract.status === "ACTIVE",
        );
        if (hasActiveContract && body.status !== "OCCUPIED") {
          throw new Error("Phòng đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi trạng thái.");
        }
        return api.updateRoom(editingRoomId, body);
      }

      if (!selectedProperty?.id) {
        throw new Error("Chưa chọn nhà trọ.");
      }
      return api.createRoom(selectedProperty.id, body);
    },
    onSuccess: async () => {
      setRoomForm(emptyRoomForm);
      setEditingRoomId(null);
      setNotice("Đã lưu phòng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const updateRoomStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RoomStatus }) => {
      const hasActiveContract = contracts.some(
        (contract) => contract.roomId === id && contract.status === "ACTIVE",
      );
      if (hasActiveContract && status !== "OCCUPIED") {
        throw new Error("Phòng đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi trạng thái.");
      }
      return api.updateRoomStatus(id, status);
    },
    onSuccess: async () => {
      setNotice("Đã cập nhật trạng thái phòng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id: string) => {
      if (contracts.some((contract) => contract.roomId === id && contract.status === "ACTIVE")) {
        throw new Error("Không thể xóa phòng đang có hợp đồng hoạt động.");
      }
      return api.deleteRoom(id);
    },
    onSuccess: async () => {
      setNotice("Đã xóa phòng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdateTenantMutation = useMutation({
    mutationFn: () => {
      const body = {
        fullName: tenantForm.fullName.trim(),
        phone: tenantForm.phone.trim(),
        email: valueOrUndefined(tenantForm.email),
        identityNumber: valueOrUndefined(tenantForm.identityNumber),
        dateOfBirth: valueOrUndefined(tenantForm.dateOfBirth),
        permanentAddress: valueOrUndefined(tenantForm.permanentAddress),
        currentRoomId: valueOrUndefined(tenantForm.currentRoomId),
        status: tenantForm.status,
        note: valueOrUndefined(tenantForm.note),
      };
      if (!body.fullName) {
        throw new Error("Vui lòng nhập họ tên khách thuê.");
      }
      if (!body.phone) {
        throw new Error("Vui lòng nhập số điện thoại khách thuê.");
      }
      if (body.email && !isValidEmail(body.email)) {
        throw new Error("Email khách thuê không hợp lệ.");
      }
      if (body.dateOfBirth && !isValidIsoDate(body.dateOfBirth)) {
        throw new Error("Ngày sinh phải có định dạng yyyy-mm-dd.");
      }
      const currentTenant = tenants.find((tenant) => tenant.id === editingTenantId);
      const hasActiveContract = currentTenant && contracts.some(
        (contract) => contract.status === "ACTIVE" && contract.tenantIds.includes(currentTenant.id),
      );
      if (
        hasActiveContract &&
        (body.status !== "ACTIVE" || body.currentRoomId !== currentTenant.currentRoomId)
      ) {
        throw new Error("Khách đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi phòng hoặc trạng thái.");
      }
      return editingTenantId ? api.updateTenant(editingTenantId, body) : api.createTenant(body);
    },
    onSuccess: async () => {
      setTenantForm(emptyTenantForm);
      setEditingTenantId(null);
      setNotice("Đã lưu khách thuê.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const markTenantLeftMutation = useMutation({
    mutationFn: (id: string) => {
      if (contracts.some((contract) => contract.status === "ACTIVE" && contract.tenantIds.includes(id))) {
        throw new Error("Khách đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước.");
      }
      return api.markTenantLeft(id);
    },
    onSuccess: async () => {
      setNotice("Đã đánh dấu khách rời đi.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdateContractMutation = useMutation({
    mutationFn: () => {
      const roomId = contractForm.roomId;
      const tenantId = contractForm.tenantId;
      if (!roomId || !tenantId) {
        throw new Error("Vui lòng chọn phòng và khách thuê.");
      }

      const monthlyRent = toNumber(contractForm.monthlyRent);
      const deposit = toNumber(contractForm.deposit);
      const paymentDueDay = toNumber(contractForm.paymentDueDay);
      if (!isValidIsoDate(contractForm.startDate) || !isValidIsoDate(contractForm.endDate)) {
        throw new Error("Ngày hợp đồng phải có định dạng yyyy-mm-dd.");
      }
      if (contractForm.startDate >= contractForm.endDate) {
        throw new Error("Ngày kết thúc phải sau ngày bắt đầu.");
      }
      if (monthlyRent < 0 || deposit < 0) {
        throw new Error("Tiền thuê và tiền cọc không được âm.");
      }
      if (!Number.isInteger(paymentDueDay) || paymentDueDay < 1 || paymentDueDay > 31) {
        throw new Error("Ngày thu tiền phải từ 1 đến 31.");
      }
      if (!editingContractId && contracts.some((contract) => contract.roomId === roomId && contract.status === "ACTIVE")) {
        throw new Error("Phòng đã có hợp đồng hoạt động.");
      }

      const body = {
        roomId,
        tenantIds: [tenantId],
        startDate: contractForm.startDate,
        endDate: contractForm.endDate,
        monthlyRent,
        deposit,
        paymentDueDay,
        note: valueOrUndefined(contractForm.note),
      };

      return editingContractId ? api.updateContract(editingContractId, body) : api.createContract(body);
    },
    onSuccess: async () => {
      setContractForm(emptyContractForm);
      setEditingContractId(null);
      setNotice("Đã lưu hợp đồng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const terminateContractMutation = useMutation({
    mutationFn: (id: string) => api.terminateContract(id, { roomStatus: "AVAILABLE", note: "Kết thúc từ app" }),
    onSuccess: async () => {
      setNotice("Đã kết thúc hợp đồng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const renewContractMutation = useMutation({
    mutationFn: (contract: Contract) =>
      api.renewContract(contract.id, {
        newEndDate: addOneYear(contract.endDate),
        monthlyRent: contract.monthlyRent,
        deposit: contract.deposit,
        paymentDueDay: contract.paymentDueDay,
        note: "Gia hạn từ app",
      }),
    onSuccess: async () => {
      setNotice("Đã gia hạn hợp đồng.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const updateServicePriceMutation = useMutation({
    mutationFn: () => {
      if (!selectedProperty?.id) {
        throw new Error("Chưa chọn nhà trọ.");
      }

      const body = {
        electricityPrice: toNumber(serviceForm.electricityPrice),
        waterPrice: toNumber(serviceForm.waterPrice),
        wifiFee: toNumber(serviceForm.wifiFee),
        garbageFee: toNumber(serviceForm.garbageFee),
        parkingFee: toNumber(serviceForm.parkingFee),
      };
      if (Object.values(body).some((value) => value < 0)) {
        throw new Error("Giá dịch vụ không được âm.");
      }
      return api.updateServicePrice(selectedProperty.id, body);
    },
    onSuccess: async () => {
      setNotice("Đã cập nhật giá dịch vụ.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdateMeterMutation = useMutation({
    mutationFn: () => {
      const roomId = meterForm.roomId;
      if (!roomId && !editingMeterId) {
        throw new Error("Vui lòng chọn phòng.");
      }

      const month = toNumber(meterForm.month);
      const year = toNumber(meterForm.year);
      const electricityOld = toNumber(meterForm.electricityOld);
      const electricityNew = toNumber(meterForm.electricityNew);
      const waterOld = toNumber(meterForm.waterOld);
      const waterNew = toNumber(meterForm.waterNew);
      if (!isValidMonthYear(month, year)) {
        throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      }
      if ([electricityOld, electricityNew, waterOld, waterNew].some((value) => value < 0)) {
        throw new Error("Chỉ số điện nước không được âm.");
      }
      if (electricityNew < electricityOld || waterNew < waterOld) {
        throw new Error("Chỉ số mới phải lớn hơn hoặc bằng chỉ số cũ.");
      }
      const duplicateReading = meterReadings.some(
        (reading) =>
          reading.id !== editingMeterId &&
          reading.roomId === roomId &&
          reading.month === month &&
          reading.year === year,
      );
      if (duplicateReading) {
        throw new Error("Phòng đã có chỉ số điện nước trong tháng này.");
      }

      const body = {
        roomId,
        month,
        year,
        electricityOld,
        electricityNew,
        waterOld,
        waterNew,
        note: valueOrUndefined(meterForm.note),
      };

      if (editingMeterId) {
        const originalReading = meterReadings.find((reading) => reading.id === editingMeterId);
        const hasInvoice = originalReading && invoices.some(
          (invoice) =>
            invoice.roomId === originalReading.roomId &&
            invoice.month === originalReading.month &&
            invoice.year === originalReading.year,
        );
        if (hasInvoice) {
          throw new Error("Không thể sửa chỉ số vì tháng này đã xuất hóa đơn. Hãy xóa hóa đơn trước.");
        }
        const { roomId: _roomId, ...updateBody } = body;
        return api.updateMeterReading(editingMeterId, updateBody);
      }

      return api.createMeterReading(body);
    },
    onSuccess: async () => {
      setMeterForm(emptyMeterForm);
      setEditingMeterId(null);
      setNotice("Đã lưu chỉ số điện nước.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const deleteMeterMutation = useMutation({
    mutationFn: (id: string) => {
      const reading = meterReadings.find((item) => item.id === id);
      const hasInvoice = reading && invoices.some(
        (invoice) =>
          invoice.roomId === reading.roomId &&
          invoice.month === reading.month &&
          invoice.year === reading.year,
      );
      if (hasInvoice) {
        throw new Error("Không thể xóa chỉ số vì tháng này đã xuất hóa đơn. Hãy xóa hóa đơn trước.");
      }
      return api.deleteMeterReading(id);
    },
    onSuccess: async () => {
      setNotice("Đã xóa chỉ số.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: () => {
      const roomId = invoiceForm.roomId;
      if (!roomId) {
        throw new Error("Vui lòng chọn phòng đang thuê.");
      }

      const month = toNumber(invoiceForm.month);
      const year = toNumber(invoiceForm.year);
      const otherFees = toNumber(invoiceForm.otherFees);
      const discountAmount = toNumber(invoiceForm.discountAmount);
      if (!isValidMonthYear(month, year)) {
        throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      }
      if (otherFees < 0 || discountAmount < 0) {
        throw new Error("Phí khác và giảm giá không được âm.");
      }
      if (invoices.some((invoice) => invoice.roomId === roomId && invoice.month === month && invoice.year === year)) {
        throw new Error("Phòng đã có hóa đơn trong tháng này.");
      }
      if (!meterReadings.some((reading) => reading.roomId === roomId && reading.month === month && reading.year === year)) {
        throw new Error("Chưa có chỉ số điện nước của phòng trong tháng này.");
      }
      if (!contracts.some((contract) => contract.roomId === roomId && contract.status === "ACTIVE")) {
        throw new Error("Phòng chưa có hợp đồng hoạt động.");
      }
      if (!servicePrice) {
        throw new Error("Nhà trọ chưa cấu hình giá dịch vụ.");
      }
      return api.generateInvoice({
        roomId,
        month,
        year,
        otherFees,
        discountAmount,
        note: valueOrUndefined(invoiceForm.note),
      });
    },
    onSuccess: async () => {
      setNotice("Đã tạo hóa đơn.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const generateMonthlyMutation = useMutation({
    mutationFn: () => {
      if (!selectedProperty?.id) {
        throw new Error("Chưa chọn nhà trọ.");
      }

      const month = toNumber(invoiceForm.month);
      const year = toNumber(invoiceForm.year);
      if (!isValidMonthYear(month, year)) {
        throw new Error("Tháng phải từ 1-12 và năm từ 2000-2100.");
      }
      if (occupiedRooms.length === 0) {
        throw new Error("Nhà trọ chưa có phòng đang thuê để tạo hóa đơn.");
      }
      return api.generateMonthlyInvoices({
        propertyId: selectedProperty.id,
        month,
        year,
      });
    },
    onSuccess: async (result) => {
      setNotice(`Đã tạo ${result.createdInvoices.length} hóa đơn, bỏ qua ${result.skippedRooms.length} phòng.`);
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createPaymentLinkMutation = useMutation({
    mutationFn: ({ invoiceId, idempotencyKey }: { invoiceId: string; idempotencyKey: string }) =>
      api.createPaymentLink(invoiceId, idempotencyKey),
    onSuccess: async (payment) => {
      setSelectedPayment(payment);
      setNotice("Đã tạo link PayOS.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const invoiceStatusMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "paid" | "cancel" }) =>
      action === "paid" ? api.markInvoicePaid(id) : api.cancelInvoice(id),
    onSuccess: async () => {
      setNotice("Đã cập nhật hóa đơn.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const createOrUpdateMaintenanceMutation = useMutation({
    mutationFn: () => {
      const roomId = maintenanceForm.roomId;
      if (!roomId) {
        throw new Error("Vui lòng chọn phòng.");
      }

      const body = {
        roomId,
        tenantId: valueOrUndefined(maintenanceForm.tenantId),
        title: maintenanceForm.title.trim(),
        description: valueOrUndefined(maintenanceForm.description),
        priority: maintenanceForm.priority,
      };
      if (!body.title) {
        throw new Error("Vui lòng nhập tiêu đề bảo trì.");
      }

      if (editingMaintenanceId) {
        const originalReq = maintenanceRequests.find((r) => r.id === editingMaintenanceId);
        if (originalReq && (originalReq.status === "DONE" || originalReq.status === "CANCELLED")) {
          throw new Error("Không thể cập nhật yêu cầu bảo trì đã hoàn tất hoặc bị hủy.");
        }
        const { roomId: _roomId, ...updateBody } = body;
        return api.updateMaintenanceRequest(editingMaintenanceId, updateBody);
      }
      return api.createMaintenanceRequest(body);
    },
    onSuccess: async () => {
      setMaintenanceForm(emptyMaintenanceForm);
      setEditingMaintenanceId(null);
      setNotice("Đã lưu yêu cầu bảo trì.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const maintenanceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
      api.updateMaintenanceStatus(id, status),
    onSuccess: async () => {
      setNotice("Đã cập nhật bảo trì.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: api.deleteMaintenanceRequest,
    onSuccess: async () => {
      setNotice("Đã xóa yêu cầu bảo trì.");
      await invalidateAll();
    },
    onError: notifyError,
  });

  const loading =
    propertiesQuery.isLoading ||
    roomsQuery.isLoading ||
    dashboardSummaryQuery.isLoading ||
    tenantsQuery.isLoading ||
    contractsQuery.isLoading ||
    invoicesQuery.isLoading;

  const screenTitle = tabs.find((tab) => tab.key === activeTab)?.label ?? "Dashboard";

  const layoutStyle = useMemo(
    () => [styles.appShell, isMobile ? styles.mobileShell : styles.desktopShell],
    [isMobile],
  );

  if (booting) {
    return (
      <View style={styles.bootScreen}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.mutedText}>Đang khởi động...</Text>
      </View>
    );
  }

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

  return (
    <View style={layoutStyle}>
      {!isMobile ? <NavRail activeTab={activeTab} onChange={setActiveTab} user={user} onLogout={logout} /> : null}
      <View style={styles.mainPane}>
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={styles.pageTitle}>{screenTitle}</Text>
            <Text style={styles.pageSub} numberOfLines={1}>
              {selectedProperty?.name ?? "Chưa có nhà trọ"} · {API_BASE_URL}
            </Text>
          </View>
          <View style={styles.topActions}>
            {loading ? <ActivityIndicator color={colors.primary} /> : null}
            <IconButton icon={RefreshCw} onPress={() => invalidateAll()} />
            <IconButton icon={LogOut} onPress={logout} tone="danger" />
          </View>
        </View>

        {notice ? <Notice text={notice} onClose={() => setNotice(null)} /> : null}

        {properties.length > 0 && (
          <View style={{ paddingHorizontal: isMobile ? spacing.md : spacing.xl, paddingTop: isMobile ? spacing.md : spacing.xl, paddingBottom: 0 }}>
            <ChipSelect
              label="🏠 Nhà trọ đang quản lý:"
              value={selectedPropertyId ?? ""}
              options={properties.map((p) => ({ label: p.name, value: p.id }))}
              onChange={(id) => {
                setNotice(null);
                setSelectedPropertyId(id);
              }}
            />
          </View>
        )}

        <ScrollView contentContainerStyle={[styles.content, isMobile && styles.mobileContent]}>
          {activeTab === "dashboard" ? (
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
              properties={properties}
              rooms={rooms}
              contracts={contracts}
              selectedPropertyId={selectedProperty?.id ?? ""}
              onSelectProperty={(id) => {
                setNotice(null);
                setSelectedPropertyId(id);
              }}
              propertyForm={propertyForm}
              setPropertyForm={(form) => {
                setNotice(null);
                setPropertyForm(form);
              }}
              editingPropertyId={editingPropertyId}
              onEditProperty={(property) => {
                setNotice(null);
                setEditingPropertyId(property.id);
                setPropertyForm({
                  name: property.name,
                  address: property.address,
                  description: property.description ?? "",
                });
              }}
              onCancelPropertyEdit={() => {
                setNotice(null);
                setEditingPropertyId(null);
                setPropertyForm(emptyPropertyForm);
              }}
              onSaveProperty={() => createOrUpdatePropertyMutation.mutate()}
              onDeleteProperty={(id) => confirmAction("Xóa nhà trọ", "Bạn có chắc chắn muốn xóa nhà trọ này không?", () => deletePropertyMutation.mutate(id))}
              roomForm={roomForm}
              setRoomForm={(form) => {
                setNotice(null);
                setRoomForm(form);
              }}
              editingRoomId={editingRoomId}
              onEditRoom={(room) => {
                setNotice(null);
                setEditingRoomId(room.id);
                setRoomForm({
                  roomNumber: room.roomNumber,
                  floor: String(room.floor ?? 0),
                  area: String(room.area ?? 0),
                  baseRent: String(room.baseRent ?? 0),
                  deposit: String(room.deposit ?? 0),
                  maxTenants: String(room.maxTenants ?? 1),
                  status: room.status,
                  note: room.note ?? "",
                });
              }}
              onCancelRoomEdit={() => {
                setNotice(null);
                setEditingRoomId(null);
                setRoomForm(emptyRoomForm);
              }}
              onSaveRoom={() => createOrUpdateRoomMutation.mutate()}
              onDeleteRoom={(id) => confirmAction("Xóa phòng", "Bạn có chắc chắn muốn xóa phòng này không?", () => deleteRoomMutation.mutate(id))}
              onUpdateRoomStatus={(id, status) => updateRoomStatusMutation.mutate({ id, status })}
              isCompact={isCompact}
            />
          ) : null}

          {activeTab === "tenants" ? (
            <TenantsScreen
              tenants={tenants}
              rooms={rooms}
              contracts={contracts}
              keyword={tenantKeyword}
              setKeyword={setTenantKeyword}
              status={tenantStatus}
              setStatus={setTenantStatus}
              form={tenantForm}
              setForm={(form) => {
                setNotice(null);
                setTenantForm(form);
              }}
              editingTenantId={editingTenantId}
              onSave={() => createOrUpdateTenantMutation.mutate()}
              onEdit={(tenant) => {
                setNotice(null);
                setEditingTenantId(tenant.id);
                setTenantForm({
                  fullName: tenant.fullName,
                  phone: tenant.phone,
                  email: tenant.email ?? "",
                  identityNumber: tenant.identityNumber ?? "",
                  dateOfBirth: tenant.dateOfBirth ?? "",
                  permanentAddress: tenant.permanentAddress ?? "",
                  currentRoomId: tenant.currentRoomId ?? "",
                  status: tenant.status,
                  note: tenant.note ?? "",
                });
              }}
              onCancel={() => {
                setNotice(null);
                setEditingTenantId(null);
                setTenantForm(emptyTenantForm);
              }}
              onMarkLeft={(id) => confirmAction("Khách rời đi", "Xác nhận khách này đã rời đi?", () => markTenantLeftMutation.mutate(id))}
              roomName={roomName}
              isSavingTenant={createOrUpdateTenantMutation.isPending}
            />
          ) : null}

          {activeTab === "contracts" ? (
            <ContractsScreen
              contracts={contracts}
              rooms={rooms}
              tenants={tenants}
              availableRooms={availableRooms}
              form={contractForm}
              setForm={(form) => {
                setNotice(null);
                setContractForm(form);
              }}
              editingContractId={editingContractId}
              onSave={() => createOrUpdateContractMutation.mutate()}
              onEdit={(contract) => {
                setNotice(null);
                setEditingContractId(contract.id);
                setContractForm({
                  roomId: contract.roomId,
                  tenantId: contract.tenantIds[0] ?? "",
                  startDate: contract.startDate,
                  endDate: contract.endDate,
                  monthlyRent: String(contract.monthlyRent),
                  deposit: String(contract.deposit),
                  paymentDueDay: String(contract.paymentDueDay),
                  note: contract.note ?? "",
                });
              }}
              onCancel={() => {
                setNotice(null);
                setEditingContractId(null);
                setContractForm(emptyContractForm);
              }}
              onTerminate={(id) => confirmAction("Kết thúc hợp đồng", "Bạn có chắc chắn muốn kết thúc hợp đồng này không?", () => terminateContractMutation.mutate(id))}
              onRenew={(contract) => renewContractMutation.mutate(contract)}
              roomName={roomName}
              tenantName={tenantName}
              isSavingContract={createOrUpdateContractMutation.isPending}
            />
          ) : null}

          {activeTab === "services" ? (
            <ServicesMeterScreen
              selectedProperty={selectedProperty}
              rooms={rooms}
              invoices={invoices}
              servicePrice={servicePrice}
              serviceForm={serviceForm}
              setServiceForm={(form) => {
                setNotice(null);
                setServiceForm(form);
              }}
              onSaveService={() => updateServicePriceMutation.mutate()}
              meterReadings={meterReadings}
              meterForm={meterForm}
              setMeterForm={(form) => {
                setNotice(null);
                setMeterForm(form);
              }}
              editingMeterId={editingMeterId}
              onSaveMeter={() => createOrUpdateMeterMutation.mutate()}
              onEditMeter={(reading) => {
                setNotice(null);
                setEditingMeterId(reading.id);
                setMeterForm({
                  roomId: reading.roomId,
                  month: String(reading.month),
                  year: String(reading.year),
                  electricityOld: String(reading.electricityOld),
                  electricityNew: String(reading.electricityNew),
                  waterOld: String(reading.waterOld),
                  waterNew: String(reading.waterNew),
                  note: reading.note ?? "",
                });
              }}
              onCancelMeter={() => {
                setNotice(null);
                setEditingMeterId(null);
                setMeterForm(emptyMeterForm);
              }}
              onDeleteMeter={(id) => confirmAction("Xóa chỉ số", "Bạn có chắc chắn muốn xóa chỉ số điện nước này?", () => deleteMeterMutation.mutate(id))}
              roomName={roomName}
              isSavingService={updateServicePriceMutation.isPending}
              isSavingMeter={createOrUpdateMeterMutation.isPending}
            />
          ) : null}

          {activeTab === "billing" ? (
            <BillingMaintenanceScreen
              mode={billingMode}
              setMode={(mode) => {
                setNotice(null);
                setBillingMode(mode);
              }}
              rooms={rooms}
              tenants={tenants}
              contracts={contracts}
              meterReadings={meterReadings}
              hasServicePrice={Boolean(servicePrice)}
              invoices={invoices}
              invoiceForm={invoiceForm}
              setInvoiceForm={(form) => {
                setNotice(null);
                setInvoiceForm(form);
              }}
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
              maintenanceStatus={maintenanceStatus}
              setMaintenanceStatus={setMaintenanceStatus}
              maintenanceForm={maintenanceForm}
              setMaintenanceForm={(form) => {
                setNotice(null);
                setMaintenanceForm(form);
              }}
              editingMaintenanceId={editingMaintenanceId}
              onSaveMaintenance={() => createOrUpdateMaintenanceMutation.mutate()}
              onEditMaintenance={(request) => {
                setNotice(null);
                setEditingMaintenanceId(request.id);
                setMaintenanceForm({
                  roomId: request.roomId,
                  tenantId: request.tenantId ?? "",
                  title: request.title,
                  description: request.description ?? "",
                  priority: request.priority,
                });
              }}
              onCancelMaintenance={() => {
                setNotice(null);
                setEditingMaintenanceId(null);
                setMaintenanceForm(emptyMaintenanceForm);
              }}
              onUpdateMaintenanceStatus={(id, status) => maintenanceStatusMutation.mutate({ id, status })}
              onDeleteMaintenance={(id) => confirmAction("Xóa yêu cầu", "Xác nhận xóa yêu cầu bảo trì này?", () => deleteMaintenanceMutation.mutate(id))}
              roomName={roomName}
              tenantName={tenantName}
              isGeneratingInvoice={generateInvoiceMutation.isPending}
              isSavingMaintenance={createOrUpdateMaintenanceMutation.isPending}
            />
          ) : null}
        </ScrollView>

        {isMobile ? <BottomNav activeTab={activeTab} onChange={setActiveTab} /> : null}
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

function LoginScreen({
  onSubmit,
  isLoading,
  notice,
  clearNotice,
}: {
  onSubmit: (body: LoginForm) => void;
  isLoading: boolean;
  notice: string | null;
  clearNotice: () => void;
}) {
  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "owner@gmail.com",
      password: "123456",
    },
  });

  return (
    <View style={styles.loginWrap}>
      <View style={styles.loginCard}>
        <View style={styles.loginLogo}>
          <Building2 color={colors.text} size={24} />
        </View>
        <Text style={styles.loginTitle}>QL Trọ Manager</Text>
        <Text style={styles.loginSub}>Đăng nhập chủ trọ</Text>
        {notice ? <Notice text={notice} onClose={clearNotice} /> : null}
        <Controller
          name="email"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Field
              label="Email"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              error={formState.errors.email?.message}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          render={({ field: { value, onChange } }) => (
            <Field
              label="Mật khẩu"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              error={formState.errors.password?.message}
            />
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
      </View>
    </View>
  );
}

function NavRail({
  activeTab,
  onChange,
  user,
  onLogout,
}: {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
  user: User | null;
  onLogout: () => void;
}) {
  return (
    <View style={styles.navRail}>
      <View style={styles.railLogo}>
        <Building2 color={colors.text} size={22} />
      </View>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeTab;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.railItem, active && styles.railItemActive]}
          >
            <Icon color={active ? colors.purple : colors.faint} size={21} />
            <Text style={[styles.railLabel, active && styles.railLabelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.railSpacer} />
      <Text style={styles.railUser}>{user?.name ?? "Owner"}</Text>
      <IconButton icon={LogOut} onPress={onLogout} tone="danger" />
    </View>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <View style={styles.bottomNav}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.key === activeTab;
        return (
          <Pressable key={tab.key} style={styles.bottomItem} onPress={() => onChange(tab.key)}>
            <Icon color={active ? colors.purple : colors.faint} size={20} />
            <Text style={[styles.bottomLabel, active && styles.bottomLabelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DashboardScreen({
  summary,
  revenue,
  roomsStatus,
  debts,
  maintenanceRequests,
  invoices,
  roomName,
  isMobile,
}: {
  summary?: import("./api/types").DashboardSummary;
  revenue?: import("./api/types").DashboardRevenue;
  roomsStatus?: import("./api/types").DashboardRoomsStatus;
  debts?: import("./api/types").DashboardDebts;
  maintenanceRequests: MaintenanceRequest[];
  invoices: Invoice[];
  roomName: (roomId?: string) => string;
  isMobile: boolean;
}) {
  const bars = [
    roomsStatus?.availableRooms ?? 0,
    roomsStatus?.occupiedRooms ?? 0,
    roomsStatus?.maintenanceRooms ?? 0,
  ];
  const maxBar = Math.max(...bars, 1);

  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        <MetricCard icon={DoorOpen} label="Tổng phòng" value={summary?.totalRooms ?? 0} tone="purple" />
        <MetricCard icon={Home} label="Đang thuê" value={summary?.occupiedRooms ?? 0} tone="green" />
        <MetricCard icon={Banknote} label="Doanh thu tháng" value={formatMoney(revenue?.paidRevenue)} tone="teal" />
        <MetricCard icon={Receipt} label="Công nợ" value={formatMoney(debts?.totalDebt)} tone="red" />
      </View>
      <View style={[styles.twoCol, isMobile && styles.twoColMobile]}>
        <Card title="Tình trạng phòng" icon={BarChart3}>
          <View style={styles.barWrap}>
            {bars.map((value, index) => (
              <View key={index} style={styles.barColumn}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: 24 + (value / maxBar) * 96,
                      backgroundColor: [colors.green, colors.primary, colors.amber][index],
                    },
                  ]}
                />
                <Text style={styles.barLabel}>{["Trống", "Thuê", "Bảo trì"][index]}</Text>
                <Text style={styles.barValue}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>
        <Card title="Hóa đơn chưa thanh toán" icon={Receipt}>
          {(debts?.invoices ?? invoices.filter((invoice) => invoice.status === "UNPAID")).slice(0, 4).map((invoice) => (
            <DataRow
              key={invoice.id}
              title={roomName(invoice.roomId)}
              subtitle={`${invoice.month}/${invoice.year}`}
              right={formatMoney(invoice.totalAmount)}
              badge={invoice.status}
              badgeTone="red"
            />
          ))}
          {debtIsEmpty(debts, invoices) ? <Empty text="Không có công nợ." /> : null}
        </Card>
      </View>
      <Card title="Bảo trì gần đây" icon={Wrench}>
        {maintenanceRequests.slice(0, 5).map((request) => (
          <DataRow
            key={request.id}
            title={request.title}
            subtitle={roomName(request.roomId)}
            right={priorityLabel(request.priority)}
            badge={statusLabel(request.status)}
            badgeTone={request.status === "DONE" ? "green" : request.status === "IN_PROGRESS" ? "amber" : "blue"}
          />
        ))}
        {maintenanceRequests.length === 0 ? <Empty text="Chưa có yêu cầu bảo trì." /> : null}
      </Card>
    </View>
  );
}

function PropertiesRoomsScreen(props: {
  properties: Property[];
  rooms: Room[];
  contracts: Contract[];
  selectedPropertyId: string;
  onSelectProperty: (id: string) => void;
  propertyForm: typeof emptyPropertyForm;
  setPropertyForm: (form: typeof emptyPropertyForm) => void;
  editingPropertyId: string | null;
  onEditProperty: (property: Property) => void;
  onCancelPropertyEdit: () => void;
  onSaveProperty: () => void;
  onDeleteProperty: (id: string) => void;
  roomForm: typeof emptyRoomForm;
  setRoomForm: (form: typeof emptyRoomForm) => void;
  editingRoomId: string | null;
  onEditRoom: (room: Room) => void;
  onCancelRoomEdit: () => void;
  onSaveRoom: () => void;
  onDeleteRoom: (id: string) => void;
  onUpdateRoomStatus: (id: string, status: RoomStatus) => void;
  isCompact: boolean;
  isSavingProperty?: boolean;
  isSavingRoom?: boolean;
}) {
  const propertyOptions = props.properties.map((property) => ({ label: property.name, value: property.id }));
  const editingRoomHasActiveContract = Boolean(
    props.editingRoomId &&
    props.contracts.some(
      (contract) => contract.roomId === props.editingRoomId && contract.status === "ACTIVE",
    ),
  );

  return (
    <View style={styles.twoCol}>
      <Card title="Nhà trọ" icon={Building2} style={styles.colForm}>
        <View style={styles.formGrid}>
          <Field label="Tên nhà trọ" value={props.propertyForm.name} onChangeText={(name) => props.setPropertyForm({ ...props.propertyForm, name })} />
          <Field label="Địa chỉ" value={props.propertyForm.address} onChangeText={(address) => props.setPropertyForm({ ...props.propertyForm, address })} />
          <Field
            label="Mô tả"
            value={props.propertyForm.description}
            onChangeText={(description) => props.setPropertyForm({ ...props.propertyForm, description })}
          />
        </View>
        <View style={styles.formActions}>
          <AppButton
            label={props.editingPropertyId ? "Lưu nhà" : "Thêm nhà"}
            icon={Save}
            onPress={props.onSaveProperty}
            disabled={!props.propertyForm.name.trim() || !props.propertyForm.address.trim()}
            isLoading={props.isSavingProperty}
          />
          {props.editingPropertyId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelPropertyEdit} /> : null}
        </View>
        <View style={styles.cardGrid}>
          {props.properties.map((property) => (
            <MiniCard key={property.id} active={property.id === props.selectedPropertyId}>
              <Text style={styles.itemTitle}>{property.name}</Text>
              <Text style={styles.itemSub}>{property.address}</Text>
              <View style={styles.actionRow}>
                <AppButton label="Chọn" variant="ghost" onPress={() => props.onSelectProperty(property.id)} />
                <IconButton icon={Edit3} onPress={() => props.onEditProperty(property)} />
                {property.id === props.selectedPropertyId && props.rooms.length === 0 ? (
                  <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteProperty(property.id)} />
                ) : null}
              </View>
            </MiniCard>
          ))}
        </View>
      </Card>

      <Card title="Phòng" icon={DoorOpen} style={styles.colList}>
        <View style={styles.formGrid}>
          <Field label="Số phòng" value={props.roomForm.roomNumber} onChangeText={(roomNumber) => props.setRoomForm({ ...props.roomForm, roomNumber })} />
          <Field label="Tầng" value={props.roomForm.floor} keyboardType="numeric" onChangeText={(floor) => props.setRoomForm({ ...props.roomForm, floor })} />
          <Field label="Diện tích" value={props.roomForm.area} keyboardType="numeric" onChangeText={(area) => props.setRoomForm({ ...props.roomForm, area })} />
          <Field label="Tiền thuê" value={props.roomForm.baseRent} keyboardType="numeric" onChangeText={(baseRent) => props.setRoomForm({ ...props.roomForm, baseRent })} />
          <Field label="Cọc" value={props.roomForm.deposit} keyboardType="numeric" onChangeText={(deposit) => props.setRoomForm({ ...props.roomForm, deposit })} />
          <Field label="Số người" value={props.roomForm.maxTenants} keyboardType="numeric" onChangeText={(maxTenants) => props.setRoomForm({ ...props.roomForm, maxTenants })} />
        </View>
        <ChipSelect
          label="Trạng thái"
          value={props.roomForm.status}
          options={(editingRoomHasActiveContract
            ? ["OCCUPIED"]
            : ["AVAILABLE", "RESERVED", "MAINTENANCE"]
          ).map((value) => ({ value, label: statusLabel(value as RoomStatus) }))}
          onChange={(status) => props.setRoomForm({ ...props.roomForm, status: status as RoomStatus })}
          disabled={editingRoomHasActiveContract}
        />
        <Field fullWidth label="Ghi chú" value={props.roomForm.note} onChangeText={(note) => props.setRoomForm({ ...props.roomForm, note })} />
        <View style={styles.formActions}>
          <AppButton
            label={props.editingRoomId ? "Lưu phòng" : "Thêm phòng"}
            icon={Plus}
            onPress={props.onSaveRoom}
            disabled={
              !props.roomForm.roomNumber.trim() ||
              !props.selectedPropertyId ||
              !areNonNegativeNumberStrings([
                props.roomForm.floor,
                props.roomForm.area,
                props.roomForm.baseRent,
                props.roomForm.deposit,
              ]) ||
              !Number.isInteger(toNumber(props.roomForm.maxTenants)) ||
              toNumber(props.roomForm.maxTenants) < 1
            }
            isLoading={props.isSavingRoom}
          />
          {props.editingRoomId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelRoomEdit} /> : null}
        </View>
        <View style={[styles.roomGrid, props.isCompact && styles.roomGridCompact]}>
          {props.rooms.map((room) => (
            <RoomTile
              key={room.id}
              room={room}
              hasActiveContract={props.contracts.some(
                (contract) => contract.roomId === room.id && contract.status === "ACTIVE",
              )}
              onEdit={() => props.onEditRoom(room)}
              onDelete={() => props.onDeleteRoom(room.id)}
              onStatus={(status) => props.onUpdateRoomStatus(room.id, status)}
            />
          ))}
        </View>
        {props.rooms.length === 0 ? <Empty text="Chưa có phòng." /> : null}
      </Card>
    </View>
  );
}

function TenantsScreen(props: {
  tenants: Tenant[];
  rooms: Room[];
  contracts: Contract[];
  keyword: string;
  setKeyword: (keyword: string) => void;
  status: TenantStatus | "";
  setStatus: (status: TenantStatus | "") => void;
  form: typeof emptyTenantForm;
  setForm: (form: typeof emptyTenantForm) => void;
  editingTenantId: string | null;
  onSave: () => void;
  onEdit: (tenant: Tenant) => void;
  onCancel: () => void;
  onMarkLeft: (id: string) => void;
  roomName: (roomId?: string) => string;
  isSavingTenant?: boolean;
}) {
  const roomOptions = [{ label: "Chưa gắn phòng", value: "" }, ...props.rooms.map((room) => ({ label: room.roomNumber, value: room.id }))];
  const editingTenant = props.tenants.find((tenant) => tenant.id === props.editingTenantId);
  const editingTenantHasActiveContract = Boolean(
    editingTenant &&
    props.contracts.some(
      (contract) => contract.status === "ACTIVE" && contract.tenantIds.includes(editingTenant.id),
    ),
  );

  return (
    <View style={styles.twoCol}>
      <Card title={props.editingTenantId ? "Sửa khách thuê" : "Thêm khách thuê"} icon={UserRound} style={styles.colForm}>
        <View style={styles.formGrid}>
          <Field label="Họ tên" value={props.form.fullName} onChangeText={(fullName) => props.setForm({ ...props.form, fullName })} />
          <Field label="Số điện thoại" value={props.form.phone} keyboardType="phone-pad" onChangeText={(phone) => props.setForm({ ...props.form, phone })} />
          <Field label="Email" value={props.form.email} keyboardType="email-address" onChangeText={(email) => props.setForm({ ...props.form, email })} />
          <Field label="CCCD" value={props.form.identityNumber} onChangeText={(identityNumber) => props.setForm({ ...props.form, identityNumber })} />
          <Field label="Ngày sinh" value={props.form.dateOfBirth} placeholder="yyyy-mm-dd" onChangeText={(dateOfBirth) => props.setForm({ ...props.form, dateOfBirth })} />
          <Field label="Địa chỉ" value={props.form.permanentAddress} onChangeText={(permanentAddress) => props.setForm({ ...props.form, permanentAddress })} />
        </View>
        <ChipSelect
          label="Phòng hiện tại"
          value={props.form.currentRoomId}
          options={roomOptions}
          onChange={(currentRoomId) => props.setForm({ ...props.form, currentRoomId })}
          disabled={editingTenantHasActiveContract}
        />
        <ChipSelect
          label="Trạng thái"
          value={props.form.status}
          options={
            editingTenantHasActiveContract
              ? [{ label: "Đang ở", value: "ACTIVE" }]
              : [
                  { label: "Đang ở", value: "ACTIVE" },
                  { label: "Đã rời", value: "LEFT" },
                ]
          }
          onChange={(status) => props.setForm({ ...props.form, status: status as TenantStatus })}
          disabled={editingTenantHasActiveContract}
        />
        <Field fullWidth label="Ghi chú" value={props.form.note} onChangeText={(note) => props.setForm({ ...props.form, note })} />
        <View style={styles.formActions}>
          <AppButton
            label={props.editingTenantId ? "Lưu khách" : "Thêm khách"}
            icon={Save}
            onPress={props.onSave}
            disabled={!props.form.fullName.trim() || !props.form.phone.trim()}
            isLoading={props.isSavingTenant}
          />
          {props.editingTenantId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancel} /> : null}
        </View>
      </Card>
      <Card title="Danh sách khách thuê" icon={Users} style={styles.colList}>
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Search color={colors.faint} size={17} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm khách"
              placeholderTextColor={colors.faint}
              value={props.keyword}
              onChangeText={props.setKeyword}
            />
          </View>
          <ChipSelect
            label=""
            value={props.status}
            compact
            options={[
              { label: "Tất cả", value: "" },
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "LEFT", value: "LEFT" },
            ]}
            onChange={(status) => props.setStatus(status as TenantStatus | "")}
          />
        </View>
        {props.tenants.map((tenant) => (
          <DataRow
            key={tenant.id}
            title={tenant.fullName}
            subtitle={`${tenant.phone} · ${props.roomName(tenant.currentRoomId)}`}
            right={tenant.email}
            badge={tenant.status}
            badgeTone={tenant.status === "ACTIVE" ? "green" : "gray"}
            actions={
              <>
                <IconButton icon={Edit3} onPress={() => props.onEdit(tenant)} />
                {tenant.status !== "LEFT" &&
                !props.contracts.some(
                  (contract) => contract.status === "ACTIVE" && contract.tenantIds.includes(tenant.id),
                ) ? (
                  <IconButton icon={X} tone="danger" onPress={() => props.onMarkLeft(tenant.id)} />
                ) : null}
              </>
            }
          />
        ))}
        {props.tenants.length === 0 ? <Empty text="Không có khách thuê." /> : null}
      </Card>
    </View>
  );
}

function ContractsScreen(props: {
  contracts: Contract[];
  rooms: Room[];
  tenants: Tenant[];
  availableRooms: Room[];
  form: typeof emptyContractForm;
  setForm: (form: typeof emptyContractForm) => void;
  editingContractId: string | null;
  onSave: () => void;
  onEdit: (contract: Contract) => void;
  onCancel: () => void;
  onTerminate: (id: string) => void;
  onRenew: (contract: Contract) => void;
  roomName: (roomId?: string) => string;
  tenantName: (tenantId?: string) => string;
  isSavingContract?: boolean;
}) {
  const roomOptions = props.availableRooms.map((room) => ({
    label: `${room.roomNumber} · ${statusLabel(room.status)}`,
    value: room.id,
  }));
  const tenantOptions = props.tenants
    .filter(
      (tenant) =>
        tenant.id === props.form.tenantId ||
        (tenant.status === "ACTIVE" &&
          !props.contracts.some(
            (contract) => contract.status === "ACTIVE" && contract.tenantIds.includes(tenant.id),
          )),
    )
    .map((tenant) => ({ label: tenant.fullName, value: tenant.id }));

  return (
    <View style={styles.twoCol}>
      <Card title={props.editingContractId ? "Sửa hợp đồng" : "Tạo hợp đồng"} icon={FileText} style={styles.colForm}>
        <ChipSelect
          label="Phòng"
          value={props.form.roomId}
          options={roomOptions}
          onChange={(roomId) => props.setForm({ ...props.form, roomId })}
          disabled={Boolean(props.editingContractId)}
        />
        <ChipSelect
          label="Khách thuê"
          value={props.form.tenantId}
          options={tenantOptions}
          onChange={(tenantId) => props.setForm({ ...props.form, tenantId })}
          disabled={Boolean(props.editingContractId)}
        />
        <View style={styles.formGrid}>
          <Field label="Ngày bắt đầu" value={props.form.startDate} onChangeText={(startDate) => props.setForm({ ...props.form, startDate })} />
          <Field label="Ngày kết thúc" value={props.form.endDate} onChangeText={(endDate) => props.setForm({ ...props.form, endDate })} />
          <Field label="Tiền thuê" value={props.form.monthlyRent} keyboardType="numeric" onChangeText={(monthlyRent) => props.setForm({ ...props.form, monthlyRent })} />
          <Field label="Tiền cọc" value={props.form.deposit} keyboardType="numeric" onChangeText={(deposit) => props.setForm({ ...props.form, deposit })} />
          <Field label="Ngày thu tiền" value={props.form.paymentDueDay} keyboardType="numeric" onChangeText={(paymentDueDay) => props.setForm({ ...props.form, paymentDueDay })} />
        </View>
        <Field fullWidth label="Ghi chú" value={props.form.note} onChangeText={(note) => props.setForm({ ...props.form, note })} />
        <View style={styles.formActions}>
          <AppButton
            label={props.editingContractId ? "Lưu hợp đồng" : "Tạo hợp đồng"}
            icon={Save}
            onPress={props.onSave}
            disabled={
              !props.form.roomId ||
              !props.form.tenantId ||
              !props.form.startDate ||
              !props.form.endDate ||
              !props.form.monthlyRent ||
              !props.form.deposit ||
              !props.form.paymentDueDay
            }
            isLoading={props.isSavingContract}
          />
          {props.editingContractId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancel} /> : null}
        </View>
      </Card>
      <Card title="Danh sách hợp đồng" icon={ClipboardList} style={styles.colList}>
        {props.contracts.map((contract) => (
          <DataRow
            key={contract.id}
            title={props.roomName(contract.roomId)}
            subtitle={`${contract.tenantIds.map(props.tenantName).join(", ")} · ${contract.startDate} → ${contract.endDate}`}
            right={formatMoney(contract.monthlyRent)}
            badge={contract.status}
            badgeTone={contract.status === "ACTIVE" ? "green" : contract.status === "TERMINATED" ? "gray" : "amber"}
            actions={
              <>
                {contract.status !== "TERMINATED" ? (
                  <IconButton icon={Edit3} onPress={() => props.onEdit(contract)} />
                ) : null}
                {contract.status === "ACTIVE" ? <IconButton icon={RefreshCw} onPress={() => props.onRenew(contract)} /> : null}
                {contract.status === "ACTIVE" ? <IconButton icon={X} tone="danger" onPress={() => props.onTerminate(contract.id)} /> : null}
              </>
            }
          />
        ))}
        {props.contracts.length === 0 ? <Empty text="Chưa có hợp đồng." /> : null}
      </Card>
    </View>
  );
}

function ServicesMeterScreen(props: {
  selectedProperty?: Property;
  rooms: Room[];
  invoices: Invoice[];
  servicePrice?: ServicePrice;
  serviceForm: typeof emptyServiceForm;
  setServiceForm: (form: typeof emptyServiceForm) => void;
  onSaveService: () => void;
  meterReadings: MeterReading[];
  meterForm: typeof emptyMeterForm;
  setMeterForm: (form: typeof emptyMeterForm) => void;
  editingMeterId: string | null;
  onSaveMeter: () => void;
  onEditMeter: (reading: MeterReading) => void;
  onCancelMeter: () => void;
  onDeleteMeter: (id: string) => void;
  roomName: (roomId?: string) => string;
  isSavingService?: boolean;
  isSavingMeter?: boolean;
}) {
  const roomOptions = props.rooms.map((room) => ({ label: room.roomNumber, value: room.id }));
  const meterMonth = toNumber(props.meterForm.month);
  const meterYear = toNumber(props.meterForm.year);
  const meterValues = [
    props.meterForm.electricityOld,
    props.meterForm.electricityNew,
    props.meterForm.waterOld,
    props.meterForm.waterNew,
  ];
  const meterFormValid =
    Boolean(props.meterForm.roomId) &&
    isValidMonthYear(meterMonth, meterYear) &&
    areNonNegativeNumberStrings(meterValues) &&
    toNumber(props.meterForm.electricityNew) >= toNumber(props.meterForm.electricityOld) &&
    toNumber(props.meterForm.waterNew) >= toNumber(props.meterForm.waterOld) &&
    !props.meterReadings.some(
      (reading) =>
        reading.id !== props.editingMeterId &&
        reading.roomId === props.meterForm.roomId &&
        reading.month === meterMonth &&
        reading.year === meterYear,
    );

  return (
    <View style={styles.twoCol}>
      <View style={[styles.stack, styles.colForm]}>
        <Card title={`Giá dịch vụ · ${props.selectedProperty?.name ?? ""}`} icon={Settings}>
        <View style={styles.metricGrid}>
          <MetricCard icon={Bolt} label="Điện" value={`${props.servicePrice?.electricityPrice ?? 0}/kWh`} tone="amber" small />
          <MetricCard icon={Banknote} label="Nước" value={`${props.servicePrice?.waterPrice ?? 0}/m3`} tone="blue" small />
          <MetricCard icon={Home} label="Wifi" value={formatMoney(props.servicePrice?.wifiFee)} tone="purple" small />
          <MetricCard icon={Trash2} label="Rác" value={formatMoney(props.servicePrice?.garbageFee)} tone="green" small />
        </View>
        <View style={styles.formGrid}>
          <Field label="Giá điện" value={props.serviceForm.electricityPrice} keyboardType="numeric" onChangeText={(electricityPrice) => props.setServiceForm({ ...props.serviceForm, electricityPrice })} />
          <Field label="Giá nước" value={props.serviceForm.waterPrice} keyboardType="numeric" onChangeText={(waterPrice) => props.setServiceForm({ ...props.serviceForm, waterPrice })} />
          <Field label="Wifi" value={props.serviceForm.wifiFee} keyboardType="numeric" onChangeText={(wifiFee) => props.setServiceForm({ ...props.serviceForm, wifiFee })} />
          <Field label="Rác" value={props.serviceForm.garbageFee} keyboardType="numeric" onChangeText={(garbageFee) => props.setServiceForm({ ...props.serviceForm, garbageFee })} />
          <Field label="Gửi xe" value={props.serviceForm.parkingFee} keyboardType="numeric" onChangeText={(parkingFee) => props.setServiceForm({ ...props.serviceForm, parkingFee })} />
        </View>
        <View style={styles.formActions}>
          <AppButton
            label="Lưu giá dịch vụ"
            icon={Save}
            onPress={props.onSaveService}
            disabled={
              !props.selectedProperty ||
              !areNonNegativeNumberStrings(Object.values(props.serviceForm))
            }
            isLoading={props.isSavingService}
          />
        </View>
      </Card>

      <Card title={props.editingMeterId ? "Sửa chỉ số" : "Ghi điện nước"} icon={Bolt}>
        <ChipSelect
          label="Phòng"
          value={props.meterForm.roomId}
          options={roomOptions}
          onChange={(roomId) => {
            const roomReadings = props.meterReadings.filter((r) => r.roomId === roomId);
            if (roomReadings.length > 0) {
              const latest = roomReadings.reduce((prev, current) =>
                prev.year * 12 + prev.month > current.year * 12 + current.month ? prev : current
              );
              props.setMeterForm({
                ...props.meterForm,
                roomId,
                electricityOld: String(latest.electricityNew),
                waterOld: String(latest.waterNew),
              });
            } else {
              props.setMeterForm({
                ...props.meterForm,
                roomId,
                electricityOld: "0",
                waterOld: "0",
              });
            }
          }}
          disabled={Boolean(props.editingMeterId)}
        />
        <View style={styles.formGrid}>
          <Field label="Tháng" value={props.meterForm.month} keyboardType="numeric" onChangeText={(month) => props.setMeterForm({ ...props.meterForm, month })} />
          <Field label="Năm" value={props.meterForm.year} keyboardType="numeric" onChangeText={(year) => props.setMeterForm({ ...props.meterForm, year })} />
          <Field label="Điện cũ" value={props.meterForm.electricityOld} keyboardType="numeric" onChangeText={(electricityOld) => props.setMeterForm({ ...props.meterForm, electricityOld })} />
          <Field label="Điện mới" value={props.meterForm.electricityNew} keyboardType="numeric" onChangeText={(electricityNew) => props.setMeterForm({ ...props.meterForm, electricityNew })} />
          <Field label="Nước cũ" value={props.meterForm.waterOld} keyboardType="numeric" onChangeText={(waterOld) => props.setMeterForm({ ...props.meterForm, waterOld })} />
          <Field label="Nước mới" value={props.meterForm.waterNew} keyboardType="numeric" onChangeText={(waterNew) => props.setMeterForm({ ...props.meterForm, waterNew })} />
        </View>
        <Field fullWidth label="Ghi chú" value={props.meterForm.note} onChangeText={(note) => props.setMeterForm({ ...props.meterForm, note })} />
        <View style={styles.formActions}>
          <AppButton
            label={props.editingMeterId ? "Lưu chỉ số" : "Thêm chỉ số"}
            icon={Save}
            onPress={props.onSaveMeter}
            disabled={!meterFormValid}
            isLoading={props.isSavingMeter}
          />
          {props.editingMeterId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelMeter} /> : null}
        </View>
      </Card>
      </View>

      <Card title="Lịch sử chỉ số" icon={ClipboardList} style={styles.colList}>
        {props.meterReadings.slice(0, 20).map((reading) => {
          const hasPaidInvoice = props.invoices.some(
            (invoice) =>
              invoice.roomId === reading.roomId &&
              invoice.month === reading.month &&
              invoice.year === reading.year &&
              invoice.status === "PAID",
          );
          return (
            <DataRow
              key={reading.id}
              title={props.roomName(reading.roomId)}
              subtitle={`${reading.month}/${reading.year} · Điện ${reading.electricityOld} → ${reading.electricityNew} · Nước ${reading.waterOld} → ${reading.waterNew}`}
              right={`Đ ${reading.electricityNew - reading.electricityOld} · N ${reading.waterNew - reading.waterOld}`}
              actions={
                hasPaidInvoice ? null : (
                  <>
                    <IconButton icon={Edit3} onPress={() => props.onEditMeter(reading)} />
                    <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteMeter(reading.id)} />
                  </>
                )
              }
            />
          );
        })}
        {props.meterReadings.length === 0 ? <Empty text="Chưa có chỉ số." /> : null}
      </Card>
    </View>
  );
}

function BillingMaintenanceScreen(props: {
  mode: "invoices" | "maintenance";
  setMode: (mode: "invoices" | "maintenance") => void;
  rooms: Room[];
  tenants: Tenant[];
  contracts: Contract[];
  meterReadings: MeterReading[];
  hasServicePrice: boolean;
  invoices: Invoice[];
  invoiceForm: typeof emptyInvoiceForm;
  setInvoiceForm: (form: typeof emptyInvoiceForm) => void;
  onGenerateInvoice: () => void;
  onGenerateMonthly: () => void;
  isGeneratingMonthly: boolean;
  onCreatePayment: (id: string) => void;
  onInvoiceStatus: (id: string, action: "paid" | "cancel") => void;
  maintenanceRequests: MaintenanceRequest[];
  maintenanceStatus: MaintenanceStatus | "";
  setMaintenanceStatus: (status: MaintenanceStatus | "") => void;
  maintenanceForm: typeof emptyMaintenanceForm;
  setMaintenanceForm: (form: typeof emptyMaintenanceForm) => void;
  editingMaintenanceId: string | null;
  onSaveMaintenance: () => void;
  onEditMaintenance: (request: MaintenanceRequest) => void;
  onCancelMaintenance: () => void;
  onUpdateMaintenanceStatus: (id: string, status: MaintenanceStatus) => void;
  onDeleteMaintenance: (id: string) => void;
  roomName: (roomId?: string) => string;
  tenantName: (tenantId?: string) => string;
  isGeneratingInvoice?: boolean;
  isSavingMaintenance?: boolean;
}) {
  const occupiedRoomOptions = props.rooms
    .filter((room) => room.status === "OCCUPIED")
    .map((room) => ({ label: room.roomNumber, value: room.id }));
  const allRoomOptions = props.rooms.map((room) => ({ label: room.roomNumber, value: room.id }));
  const tenantOptions = [{ label: "Không gắn khách", value: "" }, ...props.tenants.map((tenant) => ({ label: tenant.fullName, value: tenant.id }))];
  const invoicePeriodValid = isValidMonthYear(
    toNumber(props.invoiceForm.month),
    toNumber(props.invoiceForm.year),
  );
  const selectedInvoiceRoomId = props.invoiceForm.roomId;
  const invoiceMonth = toNumber(props.invoiceForm.month);
  const invoiceYear = toNumber(props.invoiceForm.year);
  const canGenerateSelectedInvoice =
    Boolean(selectedInvoiceRoomId) &&
    invoicePeriodValid &&
    props.hasServicePrice &&
    props.contracts.some(
      (contract) => contract.roomId === selectedInvoiceRoomId && contract.status === "ACTIVE",
    ) &&
    props.meterReadings.some(
      (reading) =>
        reading.roomId === selectedInvoiceRoomId &&
        reading.month === invoiceMonth &&
        reading.year === invoiceYear,
    ) &&
    !props.invoices.some(
      (invoice) =>
        invoice.roomId === selectedInvoiceRoomId &&
        invoice.month === invoiceMonth &&
        invoice.year === invoiceYear,
    );

  return (
    <View style={styles.stack}>
      <View style={styles.segmentBar}>
        <SegmentButton active={props.mode === "invoices"} label="Hóa đơn" onPress={() => props.setMode("invoices")} />
        <SegmentButton active={props.mode === "maintenance"} label="Bảo trì" onPress={() => props.setMode("maintenance")} />
      </View>

      {props.mode === "invoices" ? (
        <View style={styles.twoCol}>
          <Card title="Tạo hóa đơn" icon={Receipt} style={styles.colForm}>
            <ChipSelect label="Phòng" value={props.invoiceForm.roomId} options={occupiedRoomOptions} onChange={(roomId) => props.setInvoiceForm({ ...props.invoiceForm, roomId })} />
            <View style={styles.formGrid}>
              <Field label="Tháng" value={props.invoiceForm.month} keyboardType="numeric" onChangeText={(month) => props.setInvoiceForm({ ...props.invoiceForm, month })} />
              <Field label="Năm" value={props.invoiceForm.year} keyboardType="numeric" onChangeText={(year) => props.setInvoiceForm({ ...props.invoiceForm, year })} />
              <Field label="Phí khác" value={props.invoiceForm.otherFees} keyboardType="numeric" onChangeText={(otherFees) => props.setInvoiceForm({ ...props.invoiceForm, otherFees })} />
              <Field label="Giảm giá" value={props.invoiceForm.discountAmount} keyboardType="numeric" onChangeText={(discountAmount) => props.setInvoiceForm({ ...props.invoiceForm, discountAmount })} />
            </View>
            <Field fullWidth label="Ghi chú" value={props.invoiceForm.note} onChangeText={(note) => props.setInvoiceForm({ ...props.invoiceForm, note })} />
            <View style={styles.formActions}>
              <AppButton
                label="Tạo theo phòng"
                icon={Plus}
                onPress={props.onGenerateInvoice}
                disabled={
                  !canGenerateSelectedInvoice ||
                  !areNonNegativeNumberStrings([
                    props.invoiceForm.otherFees,
                    props.invoiceForm.discountAmount,
                  ])
                }
                isLoading={props.isGeneratingInvoice}
              />
              <AppButton
                label={props.isGeneratingMonthly ? "Đang tạo..." : "Tạo hàng loạt"}
                variant="secondary"
                icon={Building2}
                onPress={props.onGenerateMonthly}
                disabled={!invoicePeriodValid || occupiedRoomOptions.length === 0 || !props.hasServicePrice || props.isGeneratingMonthly}
              />
            </View>
          </Card>
          <Card title="Danh sách hóa đơn" icon={Receipt} style={styles.colList}>
            {props.invoices.map((invoice) => (
              <DataRow
                key={invoice.id}
                title={props.roomName(invoice.roomId)}
                subtitle={`${invoice.month}/${invoice.year} · hạn ${invoice.dueDate ?? "-"}`}
                right={formatMoney(invoice.totalAmount)}
                badge={invoice.status}
                badgeTone={invoice.status === "PAID" ? "green" : invoice.status === "CANCELLED" ? "gray" : "red"}
                actions={
                  <>
                    {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
                      <IconButton icon={QrCode} onPress={() => props.onCreatePayment(invoice.id)} />
                    ) : null}
                    {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
                      <IconButton icon={Check} onPress={() => props.onInvoiceStatus(invoice.id, "paid")} />
                    ) : null}
                    {invoice.status !== "PAID" && invoice.status !== "CANCELLED" ? (
                      <IconButton icon={X} tone="danger" onPress={() => props.onInvoiceStatus(invoice.id, "cancel")} />
                    ) : null}
                  </>
                }
              />
            ))}
            {props.invoices.length === 0 ? <Empty text="Chưa có hóa đơn." /> : null}
          </Card>
        </View>
      ) : (
        <View style={styles.twoCol}>
          <Card title={props.editingMaintenanceId ? "Sửa yêu cầu bảo trì" : "Tạo yêu cầu bảo trì"} icon={Wrench} style={styles.colForm}>
            <ChipSelect
              label="Phòng"
              value={props.maintenanceForm.roomId}
              options={allRoomOptions}
              onChange={(roomId) => props.setMaintenanceForm({ ...props.maintenanceForm, roomId })}
              disabled={Boolean(props.editingMaintenanceId)}
            />
            <ChipSelect label="Khách báo lỗi" value={props.maintenanceForm.tenantId} options={tenantOptions} onChange={(tenantId) => props.setMaintenanceForm({ ...props.maintenanceForm, tenantId })} />
            <View style={styles.formGrid}>
              <Field label="Tiêu đề" value={props.maintenanceForm.title} onChangeText={(title) => props.setMaintenanceForm({ ...props.maintenanceForm, title })} />
              <Field label="Mô tả" value={props.maintenanceForm.description} onChangeText={(description) => props.setMaintenanceForm({ ...props.maintenanceForm, description })} />
            </View>
            <ChipSelect
              label="Mức độ"
              value={props.maintenanceForm.priority}
              options={["LOW", "MEDIUM", "HIGH"].map((value) => ({ label: priorityLabel(value as MaintenancePriority), value }))}
              onChange={(priority) => props.setMaintenanceForm({ ...props.maintenanceForm, priority: priority as MaintenancePriority })}
            />
            <View style={styles.formActions}>
              <AppButton
                label={props.editingMaintenanceId ? "Lưu bảo trì" : "Tạo yêu cầu"}
                icon={Save}
                onPress={props.onSaveMaintenance}
                disabled={!props.maintenanceForm.roomId || !props.maintenanceForm.title.trim()}
                isLoading={props.isSavingMaintenance}
              />
              {props.editingMaintenanceId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelMaintenance} /> : null}
            </View>
          </Card>
          <Card title="Danh sách bảo trì" icon={Wrench} style={styles.colList}>
            <ChipSelect
              label="Lọc trạng thái"
              value={props.maintenanceStatus}
              options={[
                { label: "Tất cả", value: "" },
                { label: "Chờ", value: "PENDING" },
                { label: "Đang xử lý", value: "IN_PROGRESS" },
                { label: "Xong", value: "DONE" },
                { label: "Hủy", value: "CANCELLED" },
              ]}
              onChange={(status) => props.setMaintenanceStatus(status as MaintenanceStatus | "")}
            />
            {props.maintenanceRequests.map((request) => (
              <DataRow
                key={request.id}
                title={request.title}
                subtitle={`${props.roomName(request.roomId)} · ${request.tenantId ? props.tenantName(request.tenantId) : "Không gắn khách"}`}
                right={priorityLabel(request.priority)}
                badge={statusLabel(request.status)}
                badgeTone={request.status === "DONE" ? "green" : request.status === "CANCELLED" ? "gray" : "amber"}
                actions={
                  <>
                    <IconButton icon={Edit3} onPress={() => props.onEditMaintenance(request)} />
                    {request.status === "PENDING" || request.status === "IN_PROGRESS" ? (
                      <IconButton icon={Check} onPress={() => props.onUpdateMaintenanceStatus(request.id, "DONE")} />
                    ) : null}
                    <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteMaintenance(request.id)} />
                  </>
                }
              />
            ))}
            {props.maintenanceRequests.length === 0 ? <Empty text="Chưa có yêu cầu bảo trì." /> : null}
          </Card>
        </View>
      )}
    </View>
  );
}

function PaymentModal({ payment, onClose }: { payment: PaymentLinkResponse | null; onClose: () => void }) {
  return (
    <Modal visible={Boolean(payment)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.cardTitle}>PayOS</Text>
            <IconButton icon={X} onPress={onClose} />
          </View>
          <View style={styles.qrWrap}>
            {payment?.qrCode ? <QRCode value={payment.qrCode} size={180} backgroundColor="#ffffff" /> : <QrCode color={colors.teal} size={96} />}
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
          <View style={styles.actionRow}>
            <AppButton
              label="Mở link"
              icon={QrCode}
              disabled={!payment?.checkoutUrl}
              onPress={() => {
                if (payment?.checkoutUrl) {
                  Linking.openURL(payment.checkoutUrl);
                }
              }}
            />
            <AppButton label="Đóng" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RoomTile({
  room,
  hasActiveContract,
  onEdit,
  onDelete,
  onStatus,
}: {
  room: Room;
  hasActiveContract: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: RoomStatus) => void;
}) {
  const tone = room.status === "AVAILABLE" ? "green" : room.status === "OCCUPIED" ? "purple" : room.status === "MAINTENANCE" ? "red" : "amber";
  return (
    <View style={[styles.roomTile, toneStyle(tone).soft]}>
      <Text style={styles.roomNumber}>{room.roomNumber}</Text>
      <Badge label={statusLabel(room.status)} tone={tone} />
      <Text style={styles.itemSub}>{formatMoney(room.baseRent)}</Text>
      <View style={styles.actionRow}>
        <IconButton icon={Edit3} onPress={onEdit} />
        {!hasActiveContract ? <IconButton icon={Trash2} tone="danger" onPress={onDelete} /> : null}
      </View>
      {!hasActiveContract ? (
        <View style={styles.statusRow}>
          {(["AVAILABLE", "MAINTENANCE"] as RoomStatus[]).map((status) => (
            <Pressable
              key={status}
              style={[styles.tinyChip, status === room.status && styles.tinyChipActive]}
              onPress={() => onStatus(status)}
              disabled={status === room.status}
            >
              <Text style={styles.tinyChipText}>{statusLabel(status)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  small,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  tone: Tone;
  small?: boolean;
}) {
  const { width } = useWindowDimensions();
  const toneStyles = toneStyle(tone);
  return (
    <View style={[styles.metricCard, width < 760 && styles.metricCardMobile, small && styles.metricSmall]}>
      <View style={[styles.iconBadge, toneStyles.soft]}>
        <Icon color={toneStyles.color} size={small ? 18 : 22} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, width < 760 && styles.metricValueMobile, small && styles.metricValueSmall]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Card({ title, icon: Icon, children, style }: { title: string; icon: IconComponent; children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Icon color={colors.purple} size={18} />
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

function MiniCard({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return <View style={[styles.miniCard, active && styles.miniCardActive]}>{children}</View>;
}

function DataRow({
  title,
  subtitle,
  right,
  badge,
  badgeTone = "gray",
  actions,
}: {
  title: string;
  subtitle?: string;
  right?: string;
  badge?: string;
  badgeTone?: Tone;
  actions?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={[styles.dataRow, width < 760 && styles.dataRowMobile]}>
      <View style={[styles.dataMain, width < 760 && styles.dataMainMobile]}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle ? <Text style={styles.itemSub}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={styles.rowRight}>{right}</Text> : null}
      {badge ? <Badge label={badge} tone={badgeTone} /> : null}
      {actions ? <View style={styles.rowActions}>{actions}</View> : null}
    </View>
  );
}

function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const toneStyles = toneStyle(tone);
  return (
    <View style={[styles.badge, toneStyles.soft]}>
      <Text style={[styles.badgeText, { color: toneStyles.color }]}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  error,
  autoCapitalize,
  fullWidth,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  fullWidth?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, fullWidth && styles.fieldWrapFull]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        aria-label={label}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
  compact,
  disabled,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.chipWrap, compact && styles.chipWrapCompact]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={`${option.value}-${option.label}`}
              style={[styles.chip, active && styles.chipActive, disabled && styles.disabled]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function AppButton({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled,
  full,
  isLoading,
}: {
  label: string;
  onPress: () => void;
  icon?: IconComponent;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  full?: boolean;
  isLoading?: boolean;
}) {
  const isDisabled = disabled || isLoading;
  return (
    <Pressable
      style={[
        styles.button, 
        styles[`button_${variant}`], 
        full && styles.buttonFull, 
        isDisabled && styles.disabled,
        isDisabled && variant === "primary" && { backgroundColor: "rgba(148, 163, 184, 0.1)", borderColor: "rgba(148, 163, 184, 0.2)" }
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={isDisabled ? colors.faint : (variant === "primary" ? "#fff" : colors.muted)} />
      ) : Icon ? (
        <Icon color={isDisabled ? colors.faint : (variant === "primary" ? "#fff" : colors.muted)} size={16} />
      ) : null}
      <Text style={[styles.buttonText, variant === "primary" && !isDisabled && styles.buttonTextPrimary, isDisabled && { color: colors.faint }]}>
        {isLoading ? "Đang xử lý..." : label}
      </Text>
    </Pressable>
  );
}

function IconButton({
  icon: Icon,
  onPress,
  tone = "neutral",
}: {
  icon: IconComponent;
  onPress: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <Pressable style={[styles.iconButton, tone === "danger" && styles.iconButtonDanger]} onPress={onPress}>
      <Icon color={tone === "danger" ? colors.red : colors.muted} size={16} />
    </Pressable>
  );
}

function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <View style={styles.notice}>
      <Text style={styles.noticeText}>{text}</Text>
      <Pressable onPress={onClose}>
        <X color={colors.muted} size={16} />
      </Pressable>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

type Tone = "purple" | "green" | "amber" | "red" | "blue" | "teal" | "gray";

function toneStyle(tone: Tone) {
  const map = {
    purple: { color: colors.purple, soft: { backgroundColor: colors.primarySoft } },
    green: { color: colors.green, soft: { backgroundColor: colors.greenBg } },
    amber: { color: colors.amber, soft: { backgroundColor: colors.amberBg } },
    red: { color: colors.red, soft: { backgroundColor: colors.redBg } },
    blue: { color: colors.blue, soft: { backgroundColor: colors.blueBg } },
    teal: { color: colors.teal, soft: { backgroundColor: colors.tealBg } },
    gray: { color: colors.muted, soft: { backgroundColor: colors.card } },
  } satisfies Record<Tone, { color: string; soft: { backgroundColor: string } }>;
  return map[tone];
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Trống",
    OCCUPIED: "Đang thuê",
    RESERVED: "Giữ chỗ",
    MAINTENANCE: "Bảo trì",
    ACTIVE: "Hoạt động",
    LEFT: "Đã rời",
    PENDING: "Chờ xử lý",
    IN_PROGRESS: "Đang xử lý",
    DONE: "Hoàn thành",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: MaintenancePriority) {
  const labels: Record<MaintenancePriority, string> = {
    LOW: "Thấp",
    MEDIUM: "Vừa",
    HIGH: "Cao",
  };
  return labels[priority];
}

function localizeError(message: string) {
  const lower = message.toLowerCase();
  const translations: Array<[string, string]> = [
    ["cannot delete property because it still has rooms", "Không thể xóa nhà trọ khi vẫn còn phòng."],
    ["cannot delete room because it has an active contract", "Không thể xóa phòng đang có hợp đồng hoạt động."],
    ["cannot mark tenant as left because tenant has an active contract", "Không thể cho khách rời đi khi vẫn còn hợp đồng hoạt động."],
    ["room number already exists", "Số phòng đã tồn tại trong nhà trọ này."],
    ["room already has an active contract", "Phòng đã có hợp đồng hoạt động."],
    ["only active contract can be terminated", "Chỉ hợp đồng đang hoạt động mới có thể kết thúc."],
    ["only active contract can be renewed", "Chỉ hợp đồng đang hoạt động mới có thể gia hạn."],
    ["cannot update terminated contract", "Không thể sửa hợp đồng đã kết thúc."],
    ["new end date must be after current end date", "Ngày gia hạn phải sau ngày kết thúc hiện tại."],
    ["start date must be before end date", "Ngày bắt đầu phải trước ngày kết thúc."],
    ["meter reading already exists", "Phòng đã có chỉ số điện nước trong tháng này."],
    ["new electricity reading must be greater", "Chỉ số điện mới phải lớn hơn hoặc bằng chỉ số cũ."],
    ["new water reading must be greater", "Chỉ số nước mới phải lớn hơn hoặc bằng chỉ số cũ."],
    ["cannot edit or delete meter reading because invoice is already paid", "Không thể sửa hoặc xóa chỉ số vì hóa đơn đã thanh toán."],
    ["invoice already exists", "Phòng đã có hóa đơn trong tháng này."],
    ["active contract not found", "Phòng chưa có hợp đồng hoạt động."],
    ["meter reading not found for room and month", "Chưa có chỉ số điện nước của phòng trong tháng này."],
    ["service price not found", "Nhà trọ chưa cấu hình giá dịch vụ."],
    ["paid invoice cannot create", "Hóa đơn đã thanh toán nên không thể tạo link mới."],
    ["cancelled invoice cannot create", "Hóa đơn đã hủy nên không thể tạo thanh toán."],
    ["paid invoice cannot be cancelled", "Không thể hủy hóa đơn đã thanh toán."],
    ["cancelled invoice cannot be marked as paid", "Không thể đánh dấu đã trả cho hóa đơn đã hủy."],
    ["property name is required", "Vui lòng nhập tên nhà trọ."],
    ["property address is required", "Vui lòng nhập địa chỉ nhà trọ."],
    ["room number is required", "Vui lòng nhập số phòng."],
    ["tenant full name is required", "Vui lòng nhập họ tên khách thuê."],
    ["tenant phone is required", "Vui lòng nhập số điện thoại khách thuê."],
    ["tenant email must be valid", "Email khách thuê không hợp lệ."],
    ["maintenance title is required", "Vui lòng nhập tiêu đề bảo trì."],
  ];

  const translation = translations.find(([source]) => lower.includes(source));
  return translation?.[1] ?? message;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidMonthYear(month: number, year: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12 &&
    Number.isInteger(year) && year >= 2000 && year <= 2100;
}

function areNonNegativeNumberStrings(values: string[]) {
  return values.every((value) => {
    const v = value.trim() === "" ? 0 : Number(value.replace(/,/g, ""));
    return Number.isFinite(v) && v >= 0;
  });
}

function toNumber(value: string | number | undefined) {
  if (typeof value === "string") {
    value = value.replace(/,/g, "");
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function valueOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function addOneYear(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

function debtIsEmpty(debts: import("./api/types").DashboardDebts | undefined, invoices: Invoice[]) {
  if (debts) {
    return debts.debtInvoiceCount === 0;
  }
  return invoices.filter((invoice) => invoice.status === "UNPAID").length === 0;
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  desktopShell: {
    flexDirection: "row",
  },
  mobileShell: {
    flexDirection: "column",
  },
  bootScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  loginWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  loginCard: {
    width: "100%",
    maxWidth: 320,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: 24,
    backgroundColor: colors.card,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { backdropFilter: "blur(24px)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)" } as any : {}),
  },
  loginLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  loginTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  loginSub: {
    color: colors.muted,
    fontSize: 14,
  },
  loginHint: {
    color: colors.faint,
    fontSize: 11,
    textAlign: "center",
  },
  navRail: {
    width: 220,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRightWidth: 1,
    borderRightColor: colors.borderSoft,
    backgroundColor: "rgba(9, 16, 29, 0.75)",
    ...(Platform.OS === "web" ? { backdropFilter: "blur(20px)" } as any : {}),
  },
  railLogo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    marginBottom: spacing.lg,
  },
  railItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
  },
  railItemActive: {
    backgroundColor: colors.card,
  },
  railLabel: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: "600",
  },
  railLabelActive: {
    color: colors.text,
  },
  railSpacer: {
    flex: 1,
  },
  railUser: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  mainPane: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    minHeight: 78,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  topActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  pageSub: {
    color: colors.faint,
    fontSize: 12,
    marginTop: 3,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: 80,
  },
  mobileContent: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  stack: {
    gap: spacing.lg,
  },
  twoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  colForm: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 320,
  },
  colList: {
    flexGrow: 2,
    flexShrink: 1,
    minWidth: 320,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 180,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  metricCardMobile: {
    flexBasis: "45%",
    minWidth: 0,
  },
  metricSmall: {
    minWidth: 140,
    padding: spacing.md,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  metricLabel: {
    color: colors.faint,
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  metricValueSmall: {
    fontSize: 16,
  },
  metricValueMobile: {
    fontSize: 18,
  },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { backdropFilter: "blur(12px)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" } as any : {}),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  miniCard: {
    minWidth: 220,
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  miniCardActive: {
    borderColor: colors.primary,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  roomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  roomGridCompact: {
    flexDirection: "column",
  },
  roomTile: {
    minWidth: 180,
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.sm,
  },
  roomNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tinyChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.55)",
  },
  tinyChipActive: {
    borderWidth: 1,
    borderColor: colors.primary,
    opacity: 0.65,
  },
  tinyChipText: {
    color: colors.muted,
    fontSize: 10,
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  dataRowMobile: {
    flexWrap: "wrap",
  },
  dataMain: {
    flex: 1,
    minWidth: 0,
  },
  dataMainMobile: {
    flexBasis: "100%",
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  itemSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },
  rowRight: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rowActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  fieldWrap: {
    flexGrow: 1,
    minWidth: 180,
    gap: 6,
    marginBottom: spacing.md,
  },
  fieldWrapFull: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
    minWidth: 0,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    width: "100%",
    minHeight: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
  },
  inputError: {
    borderColor: colors.red,
  },
  errorText: {
    color: colors.red,
    fontSize: 11,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 220,
    flexGrow: 1,
    minHeight: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  chipWrap: {
    gap: 6,
  },
  chipWrapCompact: {
    flex: 1,
  },
  chipScroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.purple,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  formActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    position: "relative",
    zIndex: 2,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    position: "relative",
    zIndex: 3,
  },
  button_primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  button_secondary: {
    backgroundColor: colors.cardSoft,
    borderColor: colors.border,
  },
  button_ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  buttonFull: {
    width: "100%",
  },
  disabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonTextPrimary: {
    color: "#fff",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  iconButtonDanger: {
    borderColor: colors.redBg,
    backgroundColor: colors.redBg,
  },
  notice: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 13,
  },
  emptyText: {
    color: colors.faint,
    fontSize: 13,
    paddingVertical: spacing.md,
  },
  barWrap: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  bar: {
    width: "100%",
    maxWidth: 68,
    borderRadius: 8,
  },
  barLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  barValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  segmentBar: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segmentButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "700",
  },
  segmentTextActive: {
    color: "#fff",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 76,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: "rgba(9, 16, 29, 0.85)",
    flexDirection: "row",
    ...(Platform.OS === "web" ? { backdropFilter: "blur(20px)" } as any : {}),
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  bottomLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: "700",
  },
  bottomLabelActive: {
    color: colors.purple,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(2,6,23,0.76)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" } as any : {}),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qrWrap: {
    alignSelf: "center",
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  modalAmount: {
    color: colors.text,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "800",
  },
  paymentStatus: {
    alignItems: "center",
  },
  modalLink: {
    color: colors.teal,
    textAlign: "center",
    fontSize: 12,
  },
} as any);
