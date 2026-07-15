import React, { useState } from "react";
import { StyleSheet, View, Platform, Alert, ScrollView, Pressable, Text } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppButton, Card, ChipSelect, DataRow, Empty, Field, IconButton,
  ClipboardList, DoorOpen, Edit3, FileText, RefreshCw, Save, X, Users,
} from "../ui/components";
import { colors, spacing, formatMoney } from "../ui/theme";
import type { Contract, Room, Tenant } from "../api/types";
import { api } from "../api/client";
import { emptyContractForm, toNumber, isValidIsoDate, valueOrUndefined, addOneYear, localizeError, confirmAction } from "../utils";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Trống", OCCUPIED: "Đang thuê", RESERVED: "Giữ chỗ", MAINTENANCE: "Bảo trì",
    ACTIVE: "Hoạt động", TERMINATED: "Đã kết thúc", EXPIRED: "Hết hạn",
  };
  return labels[status] ?? status;
}

export function ContractsScreen(props: {
  contracts: Contract[];
  rooms: Room[];
  tenants: Tenant[];
  setNotice: (msg: string | null) => void;
}) {
  const availableRooms = props.rooms.filter((r) => r.status === "AVAILABLE");
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyContractForm);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [updatingTenantsContractId, setUpdatingTenantsContractId] = useState<string | null>(null);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);

  const notifyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    props.setNotice(localizeError(message));
  };

  const invalidateAll = async () => { await queryClient.invalidateQueries(); };

  const createOrUpdateContractMutation = useMutation({
    mutationFn: () => {
      const roomId = form.roomId;
      const tenantId = form.tenantId;
      if (!roomId || !tenantId) throw new Error("Vui lòng chọn phòng và khách thuê.");
      const monthlyRent = toNumber(form.monthlyRent);
      const deposit = toNumber(form.deposit);
      const paymentDueDay = toNumber(form.paymentDueDay);
      if (!isValidIsoDate(form.startDate) || !isValidIsoDate(form.endDate))
        throw new Error("Ngày hợp đồng phải có định dạng yyyy-mm-dd.");
      if (form.startDate >= form.endDate) throw new Error("Ngày kết thúc phải sau ngày bắt đầu.");
      if (monthlyRent < 0 || deposit < 0) throw new Error("Tiền thuê và tiền cọc không được âm.");
      if (!Number.isInteger(paymentDueDay) || paymentDueDay < 1 || paymentDueDay > 31)
        throw new Error("Ngày thu tiền phải từ 1 đến 31.");
      if (!editingContractId && props.contracts.some((c) => c.roomId === roomId && c.status === "ACTIVE"))
        throw new Error("Phòng đã có hợp đồng hoạt động.");
      const body = {
        roomId, tenantIds: [tenantId], startDate: form.startDate, endDate: form.endDate,
        monthlyRent, deposit, paymentDueDay, note: valueOrUndefined(form.note),
      };
      return editingContractId ? api.updateContract(editingContractId, body) : api.createContract(body);
    },
    onSuccess: async () => { setForm(emptyContractForm); setEditingContractId(null); props.setNotice("Đã lưu hợp đồng."); await invalidateAll(); },
    onError: notifyError,
  });

  const terminateContractMutation = useMutation({
    mutationFn: (id: string) => api.terminateContract(id, { roomStatus: "AVAILABLE", note: "Kết thúc từ app" }),
    onSuccess: async () => { props.setNotice("Đã kết thúc hợp đồng."); await invalidateAll(); },
    onError: notifyError,
  });

  const renewContractMutation = useMutation({
    mutationFn: (contract: Contract) =>
      api.renewContract(contract.id, {
        newEndDate: addOneYear(contract.endDate), monthlyRent: contract.monthlyRent,
        deposit: contract.deposit, paymentDueDay: contract.paymentDueDay, note: "Gia hạn từ app",
      }),
    onSuccess: async () => { props.setNotice("Đã gia hạn hợp đồng."); await invalidateAll(); },
    onError: notifyError,
  });

  const switchRoomMutation = useMutation({
    mutationFn: ({ contractId, newRoomId }: { contractId: string; newRoomId: string }) =>
      api.switchRoom(contractId, { newRoomId, note: "Đổi phòng từ app" }),
    onSuccess: async () => { props.setNotice("Đã đổi phòng thành công."); await invalidateAll(); },
    onError: notifyError,
  });

  const updateContractTenantsMutation = useMutation({
    mutationFn: ({ contractId, tenantIds }: { contractId: string; tenantIds: string[] }) =>
      api.updateContractTenants(contractId, { tenantIds }),
    onSuccess: async () => { props.setNotice("Đã cập nhật danh sách khách thuê."); setUpdatingTenantsContractId(null); await invalidateAll(); },
    onError: notifyError,
  });

  const handleEdit = (c: Contract) => {
    props.setNotice(null);
    setUpdatingTenantsContractId(null);
    setEditingContractId(c.id);
    setForm({ 
      roomId: c.roomId, tenantId: c.tenantIds[0] ?? "", 
      startDate: c.startDate, endDate: c.endDate, 
      monthlyRent: String(c.monthlyRent), deposit: String(c.deposit), 
      paymentDueDay: String(c.paymentDueDay), note: c.note ?? "" 
    });
  };

  const handleCancel = () => {
    props.setNotice(null);
    setEditingContractId(null);
    setForm(emptyContractForm);
  };

  const handleSwitchRoom = (c: Contract) => {
    const available = props.rooms.filter((r) => r.status === "AVAILABLE" && r.id !== c.roomId);
    if (available.length === 0) {
      props.setNotice("Không có phòng trống để đổi.");
      return;
    }
    const roomList = available.map((r, i) => `${i + 1}. ${r.roomNumber}`).join("\n");
    if (Platform.OS === "web") {
      const input = window.prompt(`Chọn phòng mới (nhập số thứ tự):\n${roomList}`);
      if (!input) return;
      const index = parseInt(input, 10) - 1;
      if (index >= 0 && index < available.length) {
        switchRoomMutation.mutate({ contractId: c.id, newRoomId: available[index].id });
      } else {
        props.setNotice("Số thứ tự phòng không hợp lệ.");
      }
    } else {
      const buttons = available.map((r) => ({
        text: r.roomNumber,
        onPress: () => switchRoomMutation.mutate({ contractId: c.id, newRoomId: r.id }),
      }));
      buttons.push({ text: "Hủy", onPress: () => {} });
      Alert.alert("Đổi phòng", "Chọn phòng mới:", buttons as any);
    }
  };

  const handleUpdateTenants = (c: Contract) => {
    props.setNotice(null);
    setEditingContractId(null);
    setUpdatingTenantsContractId(c.id);
    setSelectedTenantIds(c.tenantIds);
  };

  const roomName = (roomId?: string) => props.rooms.find((r) => r.id === roomId)?.roomNumber ?? roomId ?? "-";
  const tenantName = (tenantId?: string) => props.tenants.find((t) => t.id === tenantId)?.fullName ?? tenantId ?? "-";

  const roomOptions = availableRooms.map((r) => ({
    label: `${r.roomNumber} · ${statusLabel(r.status)}`,
    value: r.id,
  }));
  const tenantOptions = props.tenants
    .filter(
      (t) =>
        t.id === form.tenantId ||
        (t.status === "ACTIVE" &&
          !props.contracts.some((c) => c.status === "ACTIVE" && c.tenantIds.includes(t.id))),
    )
    .map((t) => ({ label: t.fullName, value: t.id }));

  const updatingContract = props.contracts.find((c) => c.id === updatingTenantsContractId);
  const validTenantsForUpdate = updatingContract 
    ? props.tenants.filter((t) => t.status === "ACTIVE" || updatingContract.tenantIds.includes(t.id))
    : [];

  return (
    <View style={styles.twoCol}>
      {updatingContract ? (
        <Card title="Khách ghép phòng" icon={Users} style={styles.colForm} delay={0}>
          <View style={{ marginBottom: spacing.md }}>
            <Text style={{ color: colors.faint, fontSize: 14 }}>
              Cho phòng: <Text style={{ color: colors.primary, fontWeight: "600" }}>{roomName(updatingContract.roomId)}</Text>
            </Text>
          </View>
          <ScrollView style={{ maxHeight: 350, marginBottom: spacing.md }} nestedScrollEnabled>
            {validTenantsForUpdate.map((t) => {
              const selected = selectedTenantIds.includes(t.id);
              return (
                <Pressable 
                  key={t.id} 
                  style={{ 
                    flexDirection: "row", alignItems: "center", padding: spacing.md, 
                    backgroundColor: selected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)', 
                    borderRadius: 8, marginBottom: 6, borderWidth: 1,
                    borderColor: selected ? 'rgba(59, 130, 246, 0.4)' : 'transparent',
                  }}
                  onPress={() => {
                    if (selected) {
                      setSelectedTenantIds(selectedTenantIds.filter(id => id !== t.id));
                    } else {
                      setSelectedTenantIds([...selectedTenantIds, t.id]);
                    }
                  }}
                >
                  <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{t.fullName} ({t.phone})</Text>
                  <Text style={{ color: selected ? colors.primary : colors.faint, fontSize: 18, fontWeight: "bold" }}>
                    {selected ? "✓" : "+"}
                  </Text>
                </Pressable>
              );
            })}
            {validTenantsForUpdate.length === 0 ? <Empty text="Không có khách thuê hợp lệ." /> : null}
          </ScrollView>
          <View style={styles.formActions}>
            <AppButton
              label="Lưu thay đổi"
              icon={Save}
              onPress={() => updateContractTenantsMutation.mutate({ contractId: updatingContract.id, tenantIds: selectedTenantIds })}
              disabled={selectedTenantIds.length === 0}
              isLoading={updateContractTenantsMutation.isPending}
            />
            <AppButton label="Hủy" variant="ghost" onPress={() => setUpdatingTenantsContractId(null)} />
          </View>
        </Card>
      ) : (
        <Card title={editingContractId ? "Sửa hợp đồng" : "Tạo hợp đồng"} icon={FileText} style={styles.colForm} delay={0}>
          <ChipSelect label="Phòng" value={form.roomId} options={roomOptions} onChange={(v) => { props.setNotice(null); setForm({ ...form, roomId: v }); }} disabled={Boolean(editingContractId)} />
          <ChipSelect label="Khách thuê" value={form.tenantId} options={tenantOptions} onChange={(v) => { props.setNotice(null); setForm({ ...form, tenantId: v }); }} disabled={Boolean(editingContractId)} />
          <View style={styles.formGrid}>
            <Field label="Ngày bắt đầu" value={form.startDate} onChangeText={(v) => setForm({ ...form, startDate: v })} />
            <Field label="Ngày kết thúc" value={form.endDate} onChangeText={(v) => setForm({ ...form, endDate: v })} />
            <Field label="Tiền thuê" value={form.monthlyRent} keyboardType="numeric" onChangeText={(v) => setForm({ ...form, monthlyRent: v })} />
            <Field label="Tiền cọc" value={form.deposit} keyboardType="numeric" onChangeText={(v) => setForm({ ...form, deposit: v })} />
            <Field label="Ngày thu tiền" value={form.paymentDueDay} keyboardType="numeric" onChangeText={(v) => setForm({ ...form, paymentDueDay: v })} />
          </View>
          <Field fullWidth label="Ghi chú" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
          <View style={styles.formActions}>
            <AppButton
              label={editingContractId ? "Lưu hợp đồng" : "Tạo hợp đồng"}
              icon={Save}
              onPress={() => createOrUpdateContractMutation.mutate()}
              disabled={!form.roomId || !form.tenantId || !form.startDate || !form.endDate || !form.monthlyRent || !form.deposit || !form.paymentDueDay}
              isLoading={createOrUpdateContractMutation.isPending}
            />
            {editingContractId ? <AppButton label="Hủy" variant="ghost" onPress={handleCancel} /> : null}
          </View>
        </Card>
      )}

      <Card title="Danh sách hợp đồng" icon={ClipboardList} style={styles.colList} delay={100}>
        {props.contracts.map((c) => (
          <DataRow
            key={c.id}
            title={roomName(c.roomId)}
            subtitle={`${c.tenantIds.map(tenantName).join(", ")} · ${c.startDate} → ${c.endDate}`}
            right={formatMoney(c.monthlyRent)}
            badge={c.status}
            badgeTone={c.status === "ACTIVE" ? "green" : c.status === "TERMINATED" ? "gray" : "amber"}
            actions={
              <>
                {c.status !== "TERMINATED" ? <IconButton icon={Edit3} onPress={() => handleEdit(c)} /> : null}
                {c.status === "ACTIVE" ? <IconButton icon={Users} onPress={() => handleUpdateTenants(c)} /> : null}
                {c.status === "ACTIVE" ? <IconButton icon={DoorOpen} onPress={() => handleSwitchRoom(c)} /> : null}
                {c.status === "ACTIVE" ? <IconButton icon={RefreshCw} onPress={() => renewContractMutation.mutate(c)} /> : null}
                {c.status === "ACTIVE" ? <IconButton icon={X} tone="danger" onPress={() => confirmAction("Kết thúc hợp đồng", "Bạn có chắc chắn muốn kết thúc hợp đồng này không?", () => terminateContractMutation.mutate(c.id))} /> : null}
              </>
            }
          />
        ))}
        {props.contracts.length === 0 ? <Empty text="Chưa có hợp đồng." /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  twoCol: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.lg },
  colForm: { flexGrow: 1, flexShrink: 1, minWidth: 320 },
  colList: { flexGrow: 2, flexShrink: 1, minWidth: 320 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: spacing.md },
  formActions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start", gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm, position: "relative", zIndex: 2 },
} as any);
