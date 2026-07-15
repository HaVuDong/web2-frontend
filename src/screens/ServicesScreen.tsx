import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppButton, Card, ChipSelect, DataRow, Empty, Field, IconButton, MetricCard,
  Banknote, Bolt, ClipboardList, Edit3, Home, Save, Settings, Trash2,
} from "../ui/components";
import { colors, spacing, formatMoney } from "../ui/theme";
import type { Invoice, MeterReading, Property, Room, ServicePrice } from "../api/types";

const emptyServiceForm = {
  electricityPrice: "4000", waterPrice: "20000", wifiFee: "100000",
  garbageFee: "30000", parkingFee: "150000",
};

const emptyMeterForm = {
  roomId: "", month: "", year: "", electricityOld: "0",
  electricityNew: "0", waterOld: "0", waterNew: "0", note: "",
};

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

export function ServicesMeterScreen(props: {
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
  const roomOptions = props.rooms.map((r) => ({ label: r.roomNumber, value: r.id }));
  const meterMonth = toNumber(props.meterForm.month);
  const meterYear = toNumber(props.meterForm.year);
  const meterValues = [props.meterForm.electricityOld, props.meterForm.electricityNew, props.meterForm.waterOld, props.meterForm.waterNew];
  const meterFormValid =
    Boolean(props.meterForm.roomId) &&
    isValidMonthYear(meterMonth, meterYear) &&
    areNonNegativeNumberStrings(meterValues) &&
    toNumber(props.meterForm.electricityNew) >= toNumber(props.meterForm.electricityOld) &&
    toNumber(props.meterForm.waterNew) >= toNumber(props.meterForm.waterOld) &&
    !props.meterReadings.some(
      (r) => r.id !== props.editingMeterId && r.roomId === props.meterForm.roomId && r.month === meterMonth && r.year === meterYear,
    );

  useEffect(() => {
    if (!props.editingMeterId && props.meterForm.roomId && meterMonth > 0 && meterYear > 0) {
      let prevMonth = meterMonth - 1;
      let prevYear = meterYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevReading = props.meterReadings.find(
        (r) => r.roomId === props.meterForm.roomId && r.month === prevMonth && r.year === prevYear
      );
      
      if (prevReading) {
        props.setMeterForm({
          ...props.meterForm,
          electricityOld: String(prevReading.electricityNew),
          waterOld: String(prevReading.waterNew)
        });
      } else {
        // Nếu không tìm thấy tháng trước, set về 0 để tránh lưu số cũ của phòng khác
        props.setMeterForm({
          ...props.meterForm,
          electricityOld: "0",
          waterOld: "0"
        });
      }
    }
  }, [props.meterForm.roomId, meterMonth, meterYear, props.editingMeterId]); // Không đưa props.meterReadings vào để tránh vòng lặp re-render không cần thiết

  return (
    <View style={styles.twoCol}>
      <View style={[styles.stack, styles.colForm]}>
        {/* ─── Service Prices ─── */}
        <Card title={`Giá dịch vụ · ${props.selectedProperty?.name ?? ""}`} icon={Settings} delay={0}>
          <View style={styles.metricGrid}>
            <MetricCard icon={Bolt} label="Điện" value={`${props.servicePrice?.electricityPrice ?? 0}/kWh`} tone="amber" small delay={50} />
            <MetricCard icon={Banknote} label="Nước" value={`${props.servicePrice?.waterPrice ?? 0}/m3`} tone="blue" small delay={100} />
            <MetricCard icon={Home} label="Wifi" value={formatMoney(props.servicePrice?.wifiFee)} tone="purple" small delay={150} />
            <MetricCard icon={Trash2} label="Rác" value={formatMoney(props.servicePrice?.garbageFee)} tone="green" small delay={200} />
          </View>
          <View style={styles.formGrid}>
            <Field label="Giá điện" value={props.serviceForm.electricityPrice} keyboardType="numeric" onChangeText={(v) => props.setServiceForm({ ...props.serviceForm, electricityPrice: v })} />
            <Field label="Giá nước" value={props.serviceForm.waterPrice} keyboardType="numeric" onChangeText={(v) => props.setServiceForm({ ...props.serviceForm, waterPrice: v })} />
            <Field label="Wifi" value={props.serviceForm.wifiFee} keyboardType="numeric" onChangeText={(v) => props.setServiceForm({ ...props.serviceForm, wifiFee: v })} />
            <Field label="Rác" value={props.serviceForm.garbageFee} keyboardType="numeric" onChangeText={(v) => props.setServiceForm({ ...props.serviceForm, garbageFee: v })} />
            <Field label="Gửi xe" value={props.serviceForm.parkingFee} keyboardType="numeric" onChangeText={(v) => props.setServiceForm({ ...props.serviceForm, parkingFee: v })} />
          </View>
          <View style={styles.formActions}>
            <AppButton
              label="Lưu giá dịch vụ"
              icon={Save}
              onPress={props.onSaveService}
              disabled={!props.selectedProperty || !areNonNegativeNumberStrings(Object.values(props.serviceForm))}
              isLoading={props.isSavingService}
            />
          </View>
        </Card>

        {/* ─── Meter Form ─── */}
        <Card title={props.editingMeterId ? "Sửa chỉ số" : "Ghi điện nước"} icon={Bolt} delay={100}>
          <ChipSelect
            label="Phòng"
            value={props.meterForm.roomId}
            options={roomOptions}
            onChange={(roomId) => props.setMeterForm({ ...props.meterForm, roomId })}
            disabled={Boolean(props.editingMeterId)}
          />
          <View style={styles.formGrid}>
            <Field label="Tháng" value={props.meterForm.month} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, month: v })} />
            <Field label="Năm" value={props.meterForm.year} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, year: v })} />
            <Field label="Điện cũ" value={props.meterForm.electricityOld} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, electricityOld: v })} />
            <Field label="Điện mới" value={props.meterForm.electricityNew} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, electricityNew: v })} />
            <Field label="Nước cũ" value={props.meterForm.waterOld} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, waterOld: v })} />
            <Field label="Nước mới" value={props.meterForm.waterNew} keyboardType="numeric" onChangeText={(v) => props.setMeterForm({ ...props.meterForm, waterNew: v })} />
          </View>
          <Field fullWidth label="Ghi chú" value={props.meterForm.note} onChangeText={(v) => props.setMeterForm({ ...props.meterForm, note: v })} />
          <View style={styles.formActions}>
            <AppButton label={props.editingMeterId ? "Lưu chỉ số" : "Thêm chỉ số"} icon={Save} onPress={props.onSaveMeter} disabled={!meterFormValid} isLoading={props.isSavingMeter} />
            {props.editingMeterId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelMeter} /> : null}
          </View>
        </Card>
      </View>

      {/* ─── Meter History ─── */}
      <Card title="Lịch sử chỉ số" icon={ClipboardList} style={styles.colList} delay={150}>
        {props.meterReadings.slice(0, 20).map((r) => {
          const hasPaidInvoice = props.invoices.some(
            (inv) => inv.roomId === r.roomId && inv.month === r.month && inv.year === r.year && inv.status === "PAID",
          );
          return (
            <DataRow
              key={r.id}
              title={props.roomName(r.roomId)}
              subtitle={`${r.month}/${r.year} · Điện ${r.electricityOld} → ${r.electricityNew} · Nước ${r.waterOld} → ${r.waterNew}`}
              right={`Đ ${r.electricityNew - r.electricityOld} · N ${r.waterNew - r.waterOld}`}
              actions={
                hasPaidInvoice ? null : (
                  <>
                    <IconButton icon={Edit3} onPress={() => props.onEditMeter(r)} />
                    <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteMeter(r.id)} />
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

const styles = StyleSheet.create({
  twoCol: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.lg },
  stack: { gap: spacing.lg },
  colForm: { flexGrow: 1, flexShrink: 1, minWidth: 320 },
  colList: { flexGrow: 2, flexShrink: 1, minWidth: 320 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  formGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.md },
  formActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm, position: "relative", zIndex: 2 },
} as any);
