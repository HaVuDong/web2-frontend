import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Modal } from "react-native";
import { AppButton, Badge, Card, DataRow, Empty, Field, IconButton } from "../ui/components";
import { colors, spacing, radius, glass, shadows, formatMoney } from "../ui/theme";
import type { Invoice, Tenant, MeterReading } from "../api/types";
import { Receipt, UserRound, KeyRound, X, Bolt, ClipboardList } from "lucide-react-native";

export function TenantDashboardScreen(props: {
  tenant: Tenant | undefined;
  invoices: Invoice[];
  meterReadings: MeterReading[];
  rentalInfo?: { room: any; property: any };
  isMobile: boolean;
  onPay: (invoiceId: string) => void;
  onChangePassword: (oldPw: string, newPw: string) => void;
  isChangingPassword?: boolean;
  onSubmitMeterReading: (month: number, year: number, electricityNew: number, waterNew: number, note?: string) => void;
  isSubmittingMeterReading?: boolean;
}) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [electricityNew, setElectricityNew] = useState("");
  const [waterNew, setWaterNew] = useState("");
  const [meterNote, setMeterNote] = useState("");

  if (!props.tenant) return <Empty text="Đang tải dữ liệu..." />;

  const unpaidInvoices = props.invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
  const paidInvoices = props.invoices.filter((i) => i.status === "PAID");

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const isPastDeadline = today.getDate() > 5;

  const currentMonthReading = props.meterReadings.find(
    (r) => r.month === currentMonth && r.year === currentYear
  );

  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevReading = props.meterReadings.find(
    (r) => r.month === prevMonth && r.year === prevYear
  );

  const electricityOld = prevReading?.electricityNew ?? 0;
  const waterOld = prevReading?.waterNew ?? 0;

  const electricityNewNum = Number(electricityNew.replace(/,/g, ""));
  const waterNewNum = Number(waterNew.replace(/,/g, ""));

  const isMeterValid = 
    !isNaN(electricityNewNum) && !isNaN(waterNewNum) &&
    electricityNewNum >= electricityOld && waterNewNum >= waterOld &&
    electricityNew.trim() !== "" && waterNew.trim() !== "";

  const handleSavePassword = () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu mới không khớp!");
      return;
    }
    setPasswordError("");
    props.onChangePassword(oldPassword, newPassword);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordModal(false);
  };

  const handleSubmitMeter = () => {
    props.onSubmitMeterReading(currentMonth, currentYear, electricityNewNum, waterNewNum, meterNote);
    setElectricityNew("");
    setWaterNew("");
    setMeterNote("");
  };

  return (
    <View style={styles.grid}>
      <Card title="Thông tin cá nhân" icon={UserRound} style={styles.col}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "bold" }}>{props.tenant.fullName}</Text>
          <Text style={{ color: colors.faint }}>Email: {props.tenant.email || "Chưa cập nhật"}</Text>
          <Text style={{ color: colors.faint }}>SĐT: {props.tenant.phone}</Text>
          <Text style={{ color: colors.faint }}>Trạng thái: <Badge text={props.tenant.status} tone={props.tenant.status === "ACTIVE" ? "green" : "gray"} /></Text>
          
          {props.rentalInfo?.property && props.rentalInfo?.room && (
            <View style={{ marginTop: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>🏠 {props.rentalInfo.property.name}</Text>
              <Text style={{ color: colors.faint, fontSize: 13 }}>{props.rentalInfo.property.address}</Text>
              <Text style={{ color: colors.primary, fontWeight: "bold", marginTop: spacing.xs }}>Phòng: {props.rentalInfo.room.roomNumber}</Text>
            </View>
          )}

          <View style={{ marginTop: spacing.md, alignSelf: "flex-start" }}>
            <AppButton label="Đổi mật khẩu" icon={KeyRound} variant="secondary" onPress={() => { setShowPasswordModal(true); setPasswordError(""); }} />
          </View>
        </View>
      </Card>

      <Card title={`Ghi chỉ số tháng ${currentMonth}/${currentYear}`} icon={Bolt} style={styles.col}>
        {currentMonthReading ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>Bạn đã gửi chỉ số cho tháng này!</Text>
            <Text style={styles.detailText}>Điện: {currentMonthReading.electricityOld} → {currentMonthReading.electricityNew}</Text>
            <Text style={styles.detailText}>Nước: {currentMonthReading.waterOld} → {currentMonthReading.waterNew}</Text>
            {currentMonthReading.submittedByTenantId && <Text style={styles.subDetailText}>(Bạn tự nhập)</Text>}
          </View>
        ) : isPastDeadline ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Đã quá hạn ngày 5 để tự nhập chỉ số.</Text>
            <Text style={styles.detailText}>Chủ trọ sẽ trực tiếp nhập chỉ số tháng này cho bạn.</Text>
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Hạn chót nhập: Ngày 5 hàng tháng</Text>
              <Text style={styles.detailText}>Số cũ sẽ được tự động lấy từ tháng trước.</Text>
            </View>
            <View style={styles.formGrid}>
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Điện cũ</Text>
                <Text style={styles.valueText}>{electricityOld}</Text>
              </View>
              <Field label="Điện mới" value={electricityNew} onChangeText={setElectricityNew} keyboardType="numeric" />
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Nước cũ</Text>
                <Text style={styles.valueText}>{waterOld}</Text>
              </View>
              <Field label="Nước mới" value={waterNew} onChangeText={setWaterNew} keyboardType="numeric" />
            </View>
            <Field fullWidth label="Ghi chú (Tùy chọn)" value={meterNote} onChangeText={setMeterNote} />
            <AppButton 
              label="Gửi chỉ số" 
              icon={Bolt} 
              onPress={handleSubmitMeter} 
              disabled={!isMeterValid} 
              isLoading={props.isSubmittingMeterReading}
            />
          </View>
        )}
      </Card>

      <Card title="Hóa đơn cần thanh toán" icon={Receipt} style={styles.col}>
        {unpaidInvoices.length === 0 ? <Empty text="Bạn không có hóa đơn nào cần thanh toán." /> : null}
        {unpaidInvoices.map((inv) => (
          <DataRow
            key={inv.id}
            title={`Hóa đơn Tháng ${inv.month}/${inv.year}`}
            subtitle={`Hạn chót: ${inv.dueDate ?? "-"}`}
            right={formatMoney(inv.totalAmount)}
            badge={inv.status === "OVERDUE" ? "QUÁ HẠN" : "CHƯA THANH TOÁN"}
            badgeTone="red"
            actions={<AppButton label="Thanh toán PayOS" onPress={() => props.onPay(inv.id)} />}
          />
        ))}
      </Card>
      
      <Card title="Lịch sử hóa đơn" icon={Receipt} style={styles.col}>
        {paidInvoices.length === 0 ? <Empty text="Chưa có lịch sử thanh toán." /> : null}
        {paidInvoices.map((inv) => (
          <DataRow
            key={inv.id}
            title={`Hóa đơn Tháng ${inv.month}/${inv.year}`}
            subtitle={`Đã thanh toán ngày: ${inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "-"}`}
            right={formatMoney(inv.totalAmount)}
            badge="ĐÃ THANH TOÁN"
            badgeTone="green"
          />
        ))}
      </Card>

      <Card title="Lịch sử chỉ số" icon={ClipboardList} style={styles.fullRow}>
        {props.meterReadings.length === 0 ? <Empty text="Chưa có lịch sử chỉ số." /> : null}
        {props.meterReadings.map((r) => (
          <DataRow
            key={r.id}
            title={`Tháng ${r.month}/${r.year}`}
            subtitle={`Điện: ${r.electricityOld} → ${r.electricityNew} | Nước: ${r.waterOld} → ${r.waterNew}`}
            right={r.submittedByTenantId ? "Khách tự nhập" : "Chủ trọ nhập"}
            badge={r.submittedByTenantId ? "TENANT" : "OWNER"}
            badgeTone={r.submittedByTenantId ? "blue" : "gray"}
          />
        ))}
      </Card>

      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi mật khẩu</Text>
              <IconButton icon={X} onPress={() => setShowPasswordModal(false)} />
            </View>
            <Field label="Mật khẩu hiện tại" value={oldPassword} onChangeText={setOldPassword} secureTextEntry />
            <Field label="Mật khẩu mới" value={newPassword} onChangeText={(v) => { setNewPassword(v); setPasswordError(""); }} secureTextEntry />
            <Field label="Nhập lại mật khẩu mới" value={confirmPassword} onChangeText={(v) => { setConfirmPassword(v); setPasswordError(""); }} secureTextEntry error={passwordError} />
            <View style={styles.modalActions}>
              <AppButton label="Lưu mật khẩu" onPress={handleSavePassword} disabled={!oldPassword || !newPassword || !confirmPassword} isLoading={props.isChangingPassword} />
              <AppButton label="Hủy" variant="ghost" onPress={() => setShowPasswordModal(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.lg },
  col: { flexGrow: 1, flexShrink: 1, minWidth: 300 },
  fullRow: { width: "100%" },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, backgroundColor: "rgba(2,6,23,0.85)" },
  modalCard: { width: "100%", maxWidth: 420, padding: spacing.xl, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: spacing.lg, ...(glass.heavy as any), ...(shadows.lg as any) },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: "700" },
  modalActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  
  formGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  fieldWrap: { flex: 1, minWidth: 100, backgroundColor: colors.bg, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, color: colors.faint, marginBottom: 4 },
  valueText: { fontSize: 16, color: colors.text, fontWeight: "600" },
  
  infoBox: { backgroundColor: "rgba(59,130,246,0.1)", padding: spacing.md, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
  infoText: { color: "#3b82f6", fontWeight: "bold", fontSize: 14 },
  
  warningBox: { backgroundColor: "rgba(245,158,11,0.1)", padding: spacing.md, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
  warningText: { color: "#b45309", fontWeight: "bold", fontSize: 14 },
  
  successBox: { backgroundColor: "rgba(34,197,94,0.1)", padding: spacing.md, borderRadius: radius.md, borderLeftWidth: 3, borderLeftColor: "#22c55e", gap: 4 },
  successText: { color: "#15803d", fontWeight: "bold", fontSize: 14 },
  
  detailText: { color: colors.muted, fontSize: 13, marginTop: 4 },
  subDetailText: { color: colors.faint, fontSize: 12, fontStyle: "italic" },
} as any);

