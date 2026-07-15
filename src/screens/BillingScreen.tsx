import React from "react";
import { StyleSheet, View } from "react-native";
import {
  AppButton, Card, ChipSelect, DataRow, Empty, Field, IconButton, SegmentButton,
  Building2, Check, Edit3, Plus, QrCode, Receipt, Save, Trash2, Wrench, X,
} from "../ui/components";
import { colors, spacing, formatMoney } from "../ui/theme";
import type {
  Contract, Invoice, MaintenancePriority, MaintenanceRequest, MaintenanceStatus,
  MeterReading, Room, Tenant,
} from "../api/types";

const emptyInvoiceForm = { roomId: "", month: "", year: "", otherFees: "0", discountAmount: "0", note: "" };
const emptyMaintenanceForm = { roomId: "", tenantId: "", title: "", description: "", priority: "MEDIUM" as MaintenancePriority };

function toNumber(value: string | number | undefined) {
  if (typeof value === "string") value = value.replace(/,/g, "");
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isValidMonthYear(month: number, year: number) {
  return Number.isInteger(month) && month >= 1 && month <= 12 &&
    Number.isInteger(year) && year >= 2000 && year <= 2100;
}

function areNonNegativeNumberStrings(values: string[]) {
  return values.every((v) => {
    const n = v.trim() === "" ? 0 : Number(v.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0;
  });
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Chờ xử lý", IN_PROGRESS: "Đang xử lý", DONE: "Hoàn thành", CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: MaintenancePriority) {
  const labels: Record<MaintenancePriority, string> = { LOW: "Thấp", MEDIUM: "Vừa", HIGH: "Cao" };
  return labels[priority];
}

export function BillingMaintenanceScreen(props: {
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
    .filter((r) => r.status === "OCCUPIED")
    .map((r) => ({ label: r.roomNumber, value: r.id }));
  const allRoomOptions = props.rooms.map((r) => ({ label: r.roomNumber, value: r.id }));
  const tenantOptions = [
    { label: "Không gắn khách", value: "" },
    ...props.tenants.map((t) => ({ label: t.fullName, value: t.id })),
  ];
  const invoicePeriodValid = isValidMonthYear(toNumber(props.invoiceForm.month), toNumber(props.invoiceForm.year));
  const selectedInvoiceRoomId = props.invoiceForm.roomId;
  const invoiceMonth = toNumber(props.invoiceForm.month);
  const invoiceYear = toNumber(props.invoiceForm.year);
  const canGenerateSelectedInvoice =
    Boolean(selectedInvoiceRoomId) &&
    invoicePeriodValid &&
    props.hasServicePrice &&
    props.contracts.some((c) => c.roomId === selectedInvoiceRoomId && c.status === "ACTIVE") &&
    props.meterReadings.some((r) => r.roomId === selectedInvoiceRoomId && r.month === invoiceMonth && r.year === invoiceYear) &&
    !props.invoices.some((inv) => inv.roomId === selectedInvoiceRoomId && inv.month === invoiceMonth && inv.year === invoiceYear);

  return (
    <View style={styles.stack}>
      {/* ─── Segment Toggle ─── */}
      <View style={styles.segmentBar}>
        <SegmentButton active={props.mode === "invoices"} label="Hóa đơn" onPress={() => props.setMode("invoices")} />
        <SegmentButton active={props.mode === "maintenance"} label="Bảo trì" onPress={() => props.setMode("maintenance")} />
      </View>

      {props.mode === "invoices" ? (
        <View style={styles.twoCol}>
          <Card title="Tạo hóa đơn" icon={Receipt} style={styles.colForm} delay={0}>
            <ChipSelect label="Phòng" value={props.invoiceForm.roomId} options={occupiedRoomOptions} onChange={(v) => props.setInvoiceForm({ ...props.invoiceForm, roomId: v })} />
            <View style={styles.formGrid}>
              <Field label="Tháng" value={props.invoiceForm.month} keyboardType="numeric" onChangeText={(v) => props.setInvoiceForm({ ...props.invoiceForm, month: v })} />
              <Field label="Năm" value={props.invoiceForm.year} keyboardType="numeric" onChangeText={(v) => props.setInvoiceForm({ ...props.invoiceForm, year: v })} />
              <Field label="Phí khác" value={props.invoiceForm.otherFees} keyboardType="numeric" onChangeText={(v) => props.setInvoiceForm({ ...props.invoiceForm, otherFees: v })} />
              <Field label="Giảm giá" value={props.invoiceForm.discountAmount} keyboardType="numeric" onChangeText={(v) => props.setInvoiceForm({ ...props.invoiceForm, discountAmount: v })} />
            </View>
            <Field fullWidth label="Ghi chú" value={props.invoiceForm.note} onChangeText={(v) => props.setInvoiceForm({ ...props.invoiceForm, note: v })} />
            <View style={styles.formActions}>
              <AppButton
                label="Tạo theo phòng"
                icon={Plus}
                onPress={props.onGenerateInvoice}
                disabled={!canGenerateSelectedInvoice || !areNonNegativeNumberStrings([props.invoiceForm.otherFees, props.invoiceForm.discountAmount])}
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

          <Card title="Danh sách hóa đơn" icon={Receipt} style={styles.colList} delay={100}>
            {props.invoices.map((inv) => (
              <DataRow
                key={inv.id}
                title={props.roomName(inv.roomId)}
                subtitle={`${inv.month}/${inv.year}`}
                right={formatMoney(inv.totalAmount)}
                badge={inv.status}
                badgeTone={inv.status === "PAID" ? "green" : inv.status === "CANCELLED" ? "gray" : "red"}
                actions={
                  <>
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" ? (
                      <IconButton icon={QrCode} onPress={() => props.onCreatePayment(inv.id)} />
                    ) : null}
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" ? (
                      <IconButton icon={Check} onPress={() => props.onInvoiceStatus(inv.id, "paid")} />
                    ) : null}
                    {inv.status !== "PAID" && inv.status !== "CANCELLED" ? (
                      <IconButton icon={X} tone="danger" onPress={() => props.onInvoiceStatus(inv.id, "cancel")} />
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
          <Card
            title={props.editingMaintenanceId ? "Sửa yêu cầu bảo trì" : "Tạo yêu cầu bảo trì"}
            icon={Wrench}
            style={styles.colForm}
            delay={0}
          >
            <ChipSelect label="Phòng" value={props.maintenanceForm.roomId} options={allRoomOptions} onChange={(v) => props.setMaintenanceForm({ ...props.maintenanceForm, roomId: v })} disabled={Boolean(props.editingMaintenanceId)} />
            <ChipSelect label="Khách báo lỗi" value={props.maintenanceForm.tenantId} options={tenantOptions} onChange={(v) => props.setMaintenanceForm({ ...props.maintenanceForm, tenantId: v })} />
            <View style={styles.formGrid}>
              <Field label="Tiêu đề" value={props.maintenanceForm.title} onChangeText={(v) => props.setMaintenanceForm({ ...props.maintenanceForm, title: v })} />
              <Field label="Mô tả" value={props.maintenanceForm.description} onChangeText={(v) => props.setMaintenanceForm({ ...props.maintenanceForm, description: v })} />
            </View>
            <ChipSelect
              label="Mức độ"
              value={props.maintenanceForm.priority}
              options={["LOW", "MEDIUM", "HIGH"].map((v) => ({ label: priorityLabel(v as MaintenancePriority), value: v }))}
              onChange={(v) => props.setMaintenanceForm({ ...props.maintenanceForm, priority: v as MaintenancePriority })}
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

          <Card title="Danh sách bảo trì" icon={Wrench} style={styles.colList} delay={100}>
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
              onChange={(v) => props.setMaintenanceStatus(v as MaintenanceStatus | "")}
            />
            {props.maintenanceRequests.map((r) => (
              <DataRow
                key={r.id}
                title={r.title}
                subtitle={`${props.roomName(r.roomId)} · ${r.tenantId ? props.tenantName(r.tenantId) : "Không gắn khách"}`}
                right={priorityLabel(r.priority)}
                badge={statusLabel(r.status)}
                badgeTone={r.status === "DONE" ? "green" : r.status === "CANCELLED" ? "gray" : "amber"}
                actions={
                  <>
                    <IconButton icon={Edit3} onPress={() => props.onEditMaintenance(r)} />
                    {r.status === "PENDING" || r.status === "IN_PROGRESS" ? (
                      <IconButton icon={Check} onPress={() => props.onUpdateMaintenanceStatus(r.id, "DONE")} />
                    ) : null}
                    <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteMaintenance(r.id)} />
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

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  segmentBar: { flexDirection: "row", gap: spacing.sm },
  twoCol: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.lg },
  colForm: { flexGrow: 1, flexShrink: 1, minWidth: 320 },
  colList: { flexGrow: 2, flexShrink: 1, minWidth: 320 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.md },
  formActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm, position: "relative", zIndex: 2 },
} as any);
