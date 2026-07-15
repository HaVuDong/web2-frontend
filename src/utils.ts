import type { Invoice, RoomStatus, TenantStatus, MaintenancePriority } from "./api/types";
import { currentMonth, currentYear } from "./ui/theme";
import { Platform, Alert } from "react-native";

export const emptyPropertyForm = { name: "", address: "", description: "" };
export const emptyRoomForm = {
  roomNumber: "", floor: "1", area: "20", baseRent: "2500000",
  deposit: "2500000", maxTenants: "2", status: "AVAILABLE" as RoomStatus, note: "",
};
export const emptyTenantForm = {
  fullName: "", phone: "", email: "", identityNumber: "",
  dateOfBirth: "", permanentAddress: "", currentRoomId: "",
  status: "ACTIVE" as TenantStatus, note: "",
};
export const emptyContractForm = {
  roomId: "", tenantId: "",
  startDate: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
  endDate: `${currentYear + 1}-${String(currentMonth).padStart(2, "0")}-01`,
  monthlyRent: "2500000", deposit: "2500000", paymentDueDay: "5", note: "",
};
export const emptyServiceForm = {
  electricityPrice: "4000", waterPrice: "20000", wifiFee: "100000",
  garbageFee: "30000", parkingFee: "150000",
};
export const emptyMeterForm = {
  roomId: "", month: String(currentMonth), year: String(currentYear),
  electricityOld: "0", electricityNew: "0", waterOld: "0", waterNew: "0", note: "",
};
export const emptyInvoiceForm = {
  roomId: "", month: String(currentMonth), year: String(currentYear),
  otherFees: "0", discountAmount: "0", note: "",
};
export const emptyMaintenanceForm = {
  roomId: "", tenantId: "", title: "", description: "",
  priority: "MEDIUM" as MaintenancePriority,
};

export function toNumber(value: string | number | undefined) {
  if (typeof value === "string") value = value.replace(/,/g, "");
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function valueOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isValidMonthYear(month: number, year: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12 &&
    Number.isInteger(year) && year >= 2000 && year <= 2100;
}

export function areNonNegativeNumberStrings(values: string[]) {
  return values.every((v) => {
    const n = v.trim() === "" ? 0 : Number(v.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0;
  });
}

export function addOneYear(dateText: string) {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export function debtIsEmpty(debts: import("./api/types").DashboardDebts | undefined, invoices: Invoice[]) {
  if (debts) return debts.debtInvoiceCount === 0;
  return invoices.filter((i) => i.status === "UNPAID").length === 0;
}

export function localizeError(message: string) {
  const lower = message.toLowerCase();
  const translations: Array<[string, string]> = [
    ["cannot delete property because it still has rooms", "Không thể xóa nhà trọ khi vẫn còn phòng."],
    ["cannot delete room because it has an active contract", "Không thể xóa phòng đang có hợp đồng hoạt động."],
    ["cannot mark tenant as left because tenant has an active contract", "Không thể cho khách rời đi khi vẫn còn hợp đồng hoạt động."],
    ["room number already exists", "Số phòng đã tồn tại trong nhà trọ này."],
    ["room already has an active contract", "Phòng đã có hợp đồng hoạt động."],
    ["only active contract can be terminated", "Chỉ hợp đồng đang hoạt động mới có thể kết thúc."],
    ["only active contract can be renewed", "Chỉ hợp đồng đang hoạt động mới có thể gia hạn."],
    ["only active contract can switch room", "Chỉ hợp đồng đang hoạt động mới có thể đổi phòng."],
    ["new room must be different from current room", "Phòng mới phải khác phòng hiện tại."],
    ["new room must be available to switch", "Phòng mới phải đang trống để đổi."],
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

export const confirmAction = (title: string, message: string, onConfirm: () => void) => {
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
