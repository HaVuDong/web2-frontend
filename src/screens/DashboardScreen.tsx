import React from "react";
import { StyleSheet, Text, View, useWindowDimensions, Platform } from "react-native";
import {
  Card, MetricCard, DataRow, Badge, DonutSegment, Empty,
  DoorOpen, Home, Banknote, Receipt, BarChart3, Wrench,
  type Tone,
} from "../ui/components";
import { colors, spacing, radius, glass, shadows, transition, formatMoney } from "../ui/theme";
import type {
  DashboardSummary, DashboardRevenue, DashboardRoomsStatus, DashboardDebts,
  MaintenanceRequest, Invoice, MaintenancePriority, MaintenanceStatus,
} from "../api/types";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Trống", OCCUPIED: "Đang thuê", RESERVED: "Giữ chỗ", MAINTENANCE: "Bảo trì",
    ACTIVE: "Hoạt động", LEFT: "Đã rời", PENDING: "Chờ xử lý", IN_PROGRESS: "Đang xử lý",
    DONE: "Hoàn thành", CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: MaintenancePriority) {
  const labels: Record<MaintenancePriority, string> = { LOW: "Thấp", MEDIUM: "Vừa", HIGH: "Cao" };
  return labels[priority];
}

function debtIsEmpty(debts: DashboardDebts | undefined, invoices: Invoice[]) {
  if (debts) return debts.debtInvoiceCount === 0;
  return invoices.filter((i) => i.status === "UNPAID").length === 0;
}

export function DashboardScreen({
  summary,
  revenue,
  roomsStatus,
  debts,
  maintenanceRequests,
  invoices,
  roomName,
  isMobile,
}: {
  summary?: DashboardSummary;
  revenue?: DashboardRevenue;
  roomsStatus?: DashboardRoomsStatus;
  debts?: DashboardDebts;
  maintenanceRequests: MaintenanceRequest[];
  invoices: Invoice[];
  roomName: (roomId?: string) => string;
  isMobile: boolean;
}) {
  const donutSegments = [
    { value: roomsStatus?.availableRooms ?? 0, color: colors.green, label: "Trống" },
    { value: roomsStatus?.occupiedRooms ?? 0, color: colors.primary, label: "Đang thuê" },
    { value: roomsStatus?.maintenanceRooms ?? 0, color: colors.amber, label: "Bảo trì" },
  ];

  return (
    <View style={styles.stack}>
      {/* ─── KPI Metrics Row ─── */}
      <View style={styles.metricGrid}>
        <MetricCard icon={DoorOpen} label="Tổng phòng" value={summary?.totalRooms ?? 0} tone="purple" delay={0} />
        <MetricCard icon={Home} label="Đang thuê" value={summary?.occupiedRooms ?? 0} tone="green" delay={60} />
        <MetricCard icon={Banknote} label="Doanh thu tháng" value={formatMoney(revenue?.paidRevenue)} tone="teal" delay={120} />
        <MetricCard icon={Receipt} label="Công nợ" value={formatMoney(debts?.totalDebt)} tone="red" delay={180} />
      </View>

      {/* ─── Bento Grid: Charts + Debts ─── */}
      <View style={[styles.bentoRow, isMobile && styles.bentoRowMobile]}>
        <Card title="Tình trạng phòng" icon={BarChart3} style={styles.bentoCard} delay={200}>
          <DonutSegment segments={donutSegments} />
        </Card>

        <Card title="Hóa đơn chưa thanh toán" icon={Receipt} style={styles.bentoCardWide} delay={260}>
          {(debts?.invoices ?? invoices.filter((i) => i.status === "UNPAID")).slice(0, 5).map((invoice) => (
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

      {/* ─── Maintenance Timeline ─── */}
      <Card title="Bảo trì gần đây" icon={Wrench} delay={320}>
        {maintenanceRequests.slice(0, 5).map((r) => (
          <DataRow
            key={r.id}
            title={r.title}
            subtitle={roomName(r.roomId)}
            right={priorityLabel(r.priority)}
            badge={statusLabel(r.status)}
            badgeTone={r.status === "DONE" ? "green" : r.status === "IN_PROGRESS" ? "amber" : "blue"}
          />
        ))}
        {maintenanceRequests.length === 0 ? <Empty text="Chưa có yêu cầu bảo trì." /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  bentoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  bentoRowMobile: {
    flexDirection: "column",
  },
  bentoCard: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 280,
  },
  bentoCardWide: {
    flexGrow: 2,
    flexShrink: 1,
    minWidth: 320,
  },
} as any);
