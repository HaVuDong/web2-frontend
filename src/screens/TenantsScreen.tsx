import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AppButton, Card, ChipSelect, DataRow, Empty, Field, IconButton,
  Edit3, Save, Search, UserRound, Users, X, Mail
} from "../ui/components";
import { colors, spacing, radius, transition } from "../ui/theme";
import type { Contract, Room, Tenant, TenantStatus } from "../api/types";
import { api } from "../api/client";
import { emptyTenantForm, valueOrUndefined, isValidEmail, isValidIsoDate, localizeError, confirmAction } from "../utils";

export function TenantsScreen(props: {
  rooms: Room[];
  contracts: Contract[];
  setNotice: (msg: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<TenantStatus | "">("");
  
  const tenantsQuery = useQuery({
    queryKey: ["tenants", keyword, status],
    queryFn: () => api.tenants({ keyword: keyword, status: status || undefined }),
  });
  const tenants = tenantsQuery.data ?? [];

  const [form, setForm] = useState(emptyTenantForm);
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  const notifyError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    props.setNotice(localizeError(message));
  };

  const invalidateAll = async () => { await queryClient.invalidateQueries(); };

  const createOrUpdateTenantMutation = useMutation({
    mutationFn: () => {
      const body = {
        fullName: form.fullName.trim(), phone: form.phone.trim(),
        email: valueOrUndefined(form.email), identityNumber: valueOrUndefined(form.identityNumber),
        dateOfBirth: valueOrUndefined(form.dateOfBirth), permanentAddress: valueOrUndefined(form.permanentAddress),
        currentRoomId: valueOrUndefined(form.currentRoomId), status: form.status, note: valueOrUndefined(form.note),
      };
      if (!body.fullName) throw new Error("Vui lòng nhập họ tên khách thuê.");
      if (!body.phone) throw new Error("Vui lòng nhập số điện thoại khách thuê.");
      if (body.email && !isValidEmail(body.email)) throw new Error("Email khách thuê không hợp lệ.");
      if (body.dateOfBirth && !isValidIsoDate(body.dateOfBirth)) throw new Error("Ngày sinh phải có định dạng yyyy-mm-dd.");
      
      const currentTenant = tenants.find((t) => t.id === editingTenantId);
      const hasActiveContract = currentTenant && props.contracts.some((c) => c.status === "ACTIVE" && c.tenantIds.includes(currentTenant.id));
      if (hasActiveContract && (body.status !== "ACTIVE" || body.currentRoomId !== currentTenant.currentRoomId))
        throw new Error("Khách đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước khi đổi phòng hoặc trạng thái.");
      
      return editingTenantId ? api.updateTenant(editingTenantId, body) : api.createTenant(body);
    },
    onSuccess: async () => { setForm(emptyTenantForm); setEditingTenantId(null); props.setNotice("Đã lưu khách thuê."); await invalidateAll(); },
    onError: notifyError,
  });

  const markTenantLeftMutation = useMutation({
    mutationFn: (id: string) => {
      if (props.contracts.some((c) => c.status === "ACTIVE" && c.tenantIds.includes(id)))
        throw new Error("Khách đang có hợp đồng hoạt động. Hãy kết thúc hợp đồng trước.");
      return api.markTenantLeft(id);
    },
    onSuccess: async () => { props.setNotice("Đã đánh dấu khách rời đi."); await invalidateAll(); },
    onError: notifyError,
  });

  const inviteTenantMutation = useMutation({
    mutationFn: api.generateAndSendInvite,
    onSuccess: async () => { props.setNotice("Đã gửi email thông tin đăng nhập cho khách thuê."); await invalidateAll(); },
    onError: notifyError,
  });

  const handleEdit = (t: Tenant) => {
    props.setNotice(null);
    setEditingTenantId(t.id);
    setForm({ 
      fullName: t.fullName, phone: t.phone, email: t.email ?? "", 
      identityNumber: t.identityNumber ?? "", dateOfBirth: t.dateOfBirth ?? "", 
      permanentAddress: t.permanentAddress ?? "", currentRoomId: t.currentRoomId ?? "", 
      status: t.status, note: t.note ?? "" 
    });
  };

  const handleCancel = () => {
    props.setNotice(null);
    setEditingTenantId(null);
    setForm(emptyTenantForm);
  };

  const editingTenant = tenants.find((t) => t.id === editingTenantId);
  const editingTenantHasActiveContract = Boolean(
    editingTenant &&
    props.contracts.some((c) => c.status === "ACTIVE" && c.tenantIds.includes(editingTenant.id)),
  );

  const roomName = (roomId?: string) => props.rooms.find((r) => r.id === roomId)?.roomNumber ?? roomId ?? "-";

  return (
    <View style={styles.twoCol}>
      {/* ─── Form ─── */}
      <Card
        title={editingTenantId ? "Sửa khách thuê" : "Thêm khách thuê"}
        icon={UserRound}
        style={styles.colForm}
        delay={0}
      >
        <View style={styles.formGrid}>
          <Field label="Họ tên" value={form.fullName} onChangeText={(v) => setForm({ ...form, fullName: v })} />
          <Field label="Số điện thoại" value={form.phone} keyboardType="phone-pad" onChangeText={(v) => setForm({ ...form, phone: v })} />
          <Field label="Email" value={form.email} keyboardType="email-address" onChangeText={(v) => setForm({ ...form, email: v })} />
          <Field label="CCCD" value={form.identityNumber} onChangeText={(v) => setForm({ ...form, identityNumber: v })} />
          <Field 
            label="Ngày sinh (yyyy-mm-dd)" 
            value={form.dateOfBirth} 
            placeholder="2003-10-08" 
            keyboardType="number-pad"
            onChangeText={(v) => {
              const cleaned = v.replace(/\D/g, "");
              let formatted = cleaned;
              if (cleaned.length > 4) formatted = cleaned.substring(0, 4) + "-" + cleaned.substring(4);
              if (cleaned.length > 6) formatted = formatted.substring(0, 7) + "-" + cleaned.substring(6, 8);
              setForm({ ...form, dateOfBirth: formatted.substring(0, 10) });
            }} 
          />
          <Field label="Địa chỉ" value={form.permanentAddress} onChangeText={(v) => setForm({ ...form, permanentAddress: v })} />
        </View>

        <ChipSelect
          label="Trạng thái"
          value={form.status}
          options={
            editingTenantHasActiveContract
              ? [{ label: "Đang ở", value: "ACTIVE" }]
              : [
                  { label: "Đang ở", value: "ACTIVE" },
                  { label: "Đã rời", value: "LEFT" },
                ]
          }
          onChange={(v) => setForm({ ...form, status: v as TenantStatus })}
          disabled={editingTenantHasActiveContract}
        />
        <Field fullWidth label="Ghi chú" value={form.note} onChangeText={(v) => setForm({ ...form, note: v })} />
        <View style={styles.formActions}>
          <AppButton
            label={editingTenantId ? "Lưu khách" : "Thêm khách"}
            icon={Save}
            onPress={() => createOrUpdateTenantMutation.mutate()}
            disabled={!form.fullName.trim() || !form.phone.trim()}
            isLoading={createOrUpdateTenantMutation.isPending}
          />
          {editingTenantId ? <AppButton label="Hủy" variant="ghost" onPress={handleCancel} /> : null}
        </View>
      </Card>

      {/* ─── List ─── */}
      <Card title="Danh sách khách thuê" icon={Users} style={styles.colList} delay={100}>
        <View style={styles.filterRow}>
          <View style={styles.searchBox}>
            <Search color={colors.faint} size={17} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm khách"
              placeholderTextColor={colors.faint}
              value={keyword}
              onChangeText={setKeyword}
            />
          </View>
          <ChipSelect
            label=""
            value={status}
            compact
            options={[
              { label: "Tất cả", value: "" },
              { label: "ACTIVE", value: "ACTIVE" },
              { label: "LEFT", value: "LEFT" },
            ]}
            onChange={(v) => setStatus(v as TenantStatus | "")}
          />
        </View>
        {tenants.map((t) => (
          <DataRow
            key={t.id}
            title={t.fullName}
            subtitle={`${t.phone} · ${roomName(t.currentRoomId)}`}
            right={t.email}
            badge={t.status}
            badgeTone={t.status === "ACTIVE" ? "green" : "gray"}
            actions={
              <>
                <IconButton icon={Mail} onPress={() => confirmAction("Gửi thư mời", "Hệ thống sẽ tạo mật khẩu ngẫu nhiên và gửi qua Email của khách thuê này. Xác nhận?", () => inviteTenantMutation.mutate(t.id))} />
                <IconButton icon={Edit3} onPress={() => handleEdit(t)} />
                {t.status !== "LEFT" &&
                !props.contracts.some((c) => c.status === "ACTIVE" && c.tenantIds.includes(t.id)) ? (
                  <IconButton icon={X} tone="danger" onPress={() => confirmAction("Xác nhận", "Cho khách rời đi?", () => markTenantLeftMutation.mutate(t.id))} />
                ) : null}
              </>
            }
          />
        ))}
        {tenants.length === 0 && !tenantsQuery.isPending ? <Empty text="Không có khách thuê." /> : null}
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
  filterRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.md },
  searchBox: {
    flexDirection: "row", alignItems: "center", minWidth: 220, flexGrow: 1,
    minHeight: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: "rgba(6,8,15,0.7)", paddingHorizontal: spacing.md, gap: spacing.sm,
    ...(transition as any),
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, outlineStyle: "none" as any },
} as any);
