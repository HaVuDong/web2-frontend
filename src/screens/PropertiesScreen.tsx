import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  AppButton, Card, ChipSelect, Empty, Field, IconButton, MiniCard, Badge,
  Building2, DoorOpen, Edit3, Plus, Save, Trash2,
  type Tone,
} from "../ui/components";
import { colors, spacing, radius, transition, formatMoney } from "../ui/theme";
import type { Contract, Property, Room, RoomStatus } from "../api/types";

const emptyPropertyForm = { name: "", address: "", description: "" };
const emptyRoomForm = {
  roomNumber: "", floor: "1", area: "20", baseRent: "2500000",
  deposit: "2500000", maxTenants: "2", status: "AVAILABLE" as RoomStatus, note: "",
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Trống", OCCUPIED: "Đang thuê", RESERVED: "Giữ chỗ", MAINTENANCE: "Bảo trì",
  };
  return labels[status] ?? status;
}

function toneForStatus(status: RoomStatus): Tone {
  return status === "AVAILABLE" ? "green" : status === "OCCUPIED" ? "purple" : status === "MAINTENANCE" ? "red" : "amber";
}

function toNumber(value: string | number | undefined) {
  if (typeof value === "string") value = value.replace(/,/g, "");
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function areNonNegativeNumberStrings(values: string[]) {
  return values.every((v) => {
    const n = v.trim() === "" ? 0 : Number(v.replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0;
  });
}

/* ─── Room Tile ─── */
function RoomTile({
  room, hasActiveContract, currentTenantsCount, onEdit, onDelete, onStatus,
}: {
  room: Room; hasActiveContract: boolean; currentTenantsCount: number;
  onEdit: () => void; onDelete: () => void;
  onStatus: (status: RoomStatus) => void;
}) {
  const tone = toneForStatus(room.status);
  let displayTone = tone;
  let displayLabel = statusLabel(room.status);
  
  const isFull = currentTenantsCount > 0 && currentTenantsCount >= (room.maxTenants ?? 1);
  if (hasActiveContract) {
    if (isFull) {
      displayTone = "amber";
      displayLabel = "Đầy";
    }
  }

  const toneColor = tone === "green" ? colors.green : tone === "purple" ? colors.primary : tone === "red" ? colors.red : colors.amber;
  return (
    <View style={[styles.roomTile]}>
      <View style={[styles.roomTileAccent, { backgroundColor: toneColor }]} />
      <Text style={styles.roomNumber}>{room.roomNumber}</Text>
      
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs }}>
        <Badge label={displayLabel} tone={displayTone} />
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "500" }}>
          ({currentTenantsCount}/{room.maxTenants ?? 1} người)
        </Text>
      </View>

      <Text style={styles.roomPrice}>{formatMoney(room.baseRent)}</Text>
      <View style={styles.actionRow}>
        <IconButton icon={Edit3} onPress={onEdit} />
        {!hasActiveContract ? <IconButton icon={Trash2} tone="danger" onPress={onDelete} /> : null}
      </View>
      {!hasActiveContract ? (
        <View style={styles.statusRow}>
          {(["AVAILABLE", "MAINTENANCE"] as RoomStatus[]).map((st) => (
            <Pressable
              key={st}
              style={[styles.tinyChip, st === room.status && styles.tinyChipActive]}
              onPress={() => onStatus(st)}
              disabled={st === room.status}
            >
              <Text style={styles.tinyChipText}>{statusLabel(st)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/* ─── Main Screen ─── */
export function PropertiesRoomsScreen(props: {
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
  const editingRoomHasActiveContract = Boolean(
    props.editingRoomId &&
    props.contracts.some((c) => c.roomId === props.editingRoomId && c.status === "ACTIVE"),
  );

  return (
    <View style={styles.twoCol}>
      {/* ─── Property Form ─── */}
      <Card title="Nhà trọ" icon={Building2} style={styles.colForm} delay={0}>
        <View style={styles.formGrid}>
          <Field label="Tên nhà trọ" value={props.propertyForm.name} onChangeText={(name) => props.setPropertyForm({ ...props.propertyForm, name })} />
          <Field label="Địa chỉ" value={props.propertyForm.address} onChangeText={(address) => props.setPropertyForm({ ...props.propertyForm, address })} />
          <Field label="Mô tả" value={props.propertyForm.description} onChangeText={(description) => props.setPropertyForm({ ...props.propertyForm, description })} />
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
          {props.properties.map((p) => (
            <MiniCard key={p.id} active={p.id === props.selectedPropertyId}>
              <Text style={styles.itemTitle}>{p.name}</Text>
              <Text style={styles.itemSub}>{p.address}</Text>
              <View style={styles.actionRow}>
                <AppButton label="Chọn" variant="ghost" onPress={() => props.onSelectProperty(p.id)} />
                <IconButton icon={Edit3} onPress={() => props.onEditProperty(p)} />
                {p.id === props.selectedPropertyId && props.rooms.length === 0 ? (
                  <IconButton icon={Trash2} tone="danger" onPress={() => props.onDeleteProperty(p.id)} />
                ) : null}
              </View>
            </MiniCard>
          ))}
        </View>
      </Card>

      {/* ─── Room Form + Grid ─── */}
      <Card title="Phòng" icon={DoorOpen} style={styles.colList} delay={100}>
        <View style={styles.formGrid}>
          <Field label="Số phòng" value={props.roomForm.roomNumber} onChangeText={(v) => props.setRoomForm({ ...props.roomForm, roomNumber: v })} />
          <Field label="Tầng" value={props.roomForm.floor} keyboardType="numeric" onChangeText={(v) => props.setRoomForm({ ...props.roomForm, floor: v })} />
          <Field label="Diện tích" value={props.roomForm.area} keyboardType="numeric" onChangeText={(v) => props.setRoomForm({ ...props.roomForm, area: v })} />
          <Field label="Tiền thuê" value={props.roomForm.baseRent} keyboardType="numeric" onChangeText={(v) => props.setRoomForm({ ...props.roomForm, baseRent: v })} />
          <Field label="Cọc" value={props.roomForm.deposit} keyboardType="numeric" onChangeText={(v) => props.setRoomForm({ ...props.roomForm, deposit: v })} />
          <Field label="Số người" value={props.roomForm.maxTenants} keyboardType="numeric" onChangeText={(v) => props.setRoomForm({ ...props.roomForm, maxTenants: v })} />
        </View>
        <ChipSelect
          label="Trạng thái"
          value={props.roomForm.status}
          options={(editingRoomHasActiveContract
            ? ["OCCUPIED"]
            : ["AVAILABLE", "RESERVED", "MAINTENANCE"]
          ).map((v) => ({ value: v, label: statusLabel(v) }))}
          onChange={(st) => props.setRoomForm({ ...props.roomForm, status: st as RoomStatus })}
          disabled={editingRoomHasActiveContract}
        />
        <Field fullWidth label="Ghi chú" value={props.roomForm.note} onChangeText={(v) => props.setRoomForm({ ...props.roomForm, note: v })} />
        <View style={styles.formActions}>
          <AppButton
            label={props.editingRoomId ? "Lưu phòng" : "Thêm phòng"}
            icon={Plus}
            onPress={props.onSaveRoom}
            disabled={
              !props.roomForm.roomNumber.trim() ||
              !props.selectedPropertyId ||
              !areNonNegativeNumberStrings([props.roomForm.floor, props.roomForm.area, props.roomForm.baseRent, props.roomForm.deposit]) ||
              !Number.isInteger(toNumber(props.roomForm.maxTenants)) ||
              toNumber(props.roomForm.maxTenants) < 1
            }
            isLoading={props.isSavingRoom}
          />
          {props.editingRoomId ? <AppButton label="Hủy" variant="ghost" onPress={props.onCancelRoomEdit} /> : null}
        </View>
        <View style={[styles.roomGrid, props.isCompact && styles.roomGridCompact]}>
          {props.rooms.map((room) => {
            const activeContract = props.contracts.find((c) => c.roomId === room.id && c.status === "ACTIVE");
            const currentTenantsCount = activeContract ? activeContract.tenantIds.length : 0;
            return (
              <RoomTile
                key={room.id}
                room={room}
                hasActiveContract={Boolean(activeContract)}
                currentTenantsCount={currentTenantsCount}
                onEdit={() => props.onEditRoom(room)}
                onDelete={() => props.onDeleteRoom(room.id)}
                onStatus={(st) => props.onUpdateRoomStatus(room.id, st)}
              />
            );
          })}
        </View>
        {props.rooms.length === 0 ? <Empty text="Chưa có phòng." /> : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  twoCol: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.lg,
  },
  colForm: { flexGrow: 1, flexShrink: 1, minWidth: 320 },
  colList: { flexGrow: 2, flexShrink: 1, minWidth: 320 },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: spacing.md,
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
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
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
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,30,0.6)",
    gap: spacing.sm,
    overflow: "hidden",
    position: "relative",
    ...(transition as any),
  },
  roomTileAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  roomNumber: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: spacing.xs,
  },
  roomPrice: {
    color: colors.muted,
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tinyChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: "rgba(6,8,15,0.55)",
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
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  itemSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
} as any);
