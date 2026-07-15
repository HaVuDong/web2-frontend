import React, { useState } from "react";
import { StyleSheet, Text, View, Modal, Pressable } from "react-native";
import { AppButton, Badge, Card, DataRow, Empty, Field, IconButton } from "../ui/components";
import { colors, spacing, radius, glass, shadows } from "../ui/theme";
import type { Invoice, Tenant } from "../api/types";
import { Receipt, UserRound, KeyRound, X } from "lucide-react-native";
import { formatMoney } from "../ui/theme";

export function TenantDashboardScreen(props: {
  tenant: Tenant | undefined;
  invoices: Invoice[];
  rentalInfo?: { room: any; property: any };
  isMobile: boolean;
  onPay: (invoiceId: string) => void;
  onChangePassword: (oldPw: string, newPw: string) => void;
  isChangingPassword?: boolean;
}) {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  if (!props.tenant) return <Empty text="Đang tải dữ liệu..." />;

  const unpaidInvoices = props.invoices.filter((i) => i.status === "UNPAID" || i.status === "OVERDUE");
  const paidInvoices = props.invoices.filter((i) => i.status === "PAID");

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
      
      <Card title="Lịch sử hóa đơn" icon={Receipt} style={styles.fullRow}>
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
} as any);
