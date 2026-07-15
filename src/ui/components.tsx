import {
  Banknote,
  BarChart3,
  Bolt,
  Building2,
  Check,
  ClipboardList,
  DoorOpen,
  Edit3,
  FileText,
  Home,
  LogIn,
  LogOut,
  Mail,
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
  Copy,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardTypeOptions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { colors, glass, radius, shadows, spacing, transition, transitionFast, typography } from "./theme";

/* ─── Re-export icons for screens ─── */
export {
  Banknote, BarChart3, Bolt, Building2, Check, ClipboardList, Copy,
  DoorOpen, Edit3, FileText, Home, LogIn, LogOut, Mail, Plus, QrCode,
  Receipt, RefreshCw, Save, Search, Settings, Trash2, UserRound,
  Users, Wrench, X,
};

/* ─── Types ─── */
export type IconComponent = React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
export type Tone = "purple" | "green" | "amber" | "red" | "blue" | "teal" | "gray";

/* ─── Tone Map ─── */
export function toneStyle(tone: Tone) {
  const map = {
    purple: { color: colors.primary, soft: { backgroundColor: colors.primarySoft } },
    green: { color: colors.green, soft: { backgroundColor: colors.greenBg } },
    amber: { color: colors.amber, soft: { backgroundColor: colors.amberBg } },
    red: { color: colors.red, soft: { backgroundColor: colors.redBg } },
    blue: { color: colors.blue, soft: { backgroundColor: colors.blueBg } },
    teal: { color: colors.teal, soft: { backgroundColor: colors.tealBg } },
    gray: { color: colors.muted, soft: { backgroundColor: "rgba(30,40,60,0.5)" } },
  } satisfies Record<Tone, { color: string; soft: { backgroundColor: string } }>;
  return map[tone];
}

/* ─── Press Scale Hook ─── */
function usePressScale(toValue = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale, toValue]);
  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}

/* ─── Fade In Hook ─── */
export function useFadeIn(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);
  return { opacity, transform: [{ translateY }] };
}

/* ═══════════════════════════════════════════════
   CARD — Glassmorphism container
   ═══════════════════════════════════════════════ */
export function Card({
  title,
  icon: Icon,
  children,
  style,
  delay = 0,
}: {
  title: string;
  icon: IconComponent;
  children: React.ReactNode;
  style?: any;
  delay?: number;
}) {
  const fadeIn = useFadeIn(delay);
  return (
    <Animated.View style={[s.card, style, fadeIn]}>
      <View style={s.cardHeader}>
        <View style={s.cardTitleRow}>
          <View style={s.cardIconWrap}>
            <Icon color={colors.primaryLight} size={16} strokeWidth={2.5} />
          </View>
          <Text style={s.cardTitle}>{title}</Text>
        </View>
      </View>
      {children}
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════
   METRIC CARD — Dashboard KPI
   ═══════════════════════════════════════════════ */
export function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
  small,
  delay = 0,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  tone: Tone;
  small?: boolean;
  delay?: number;
}) {
  const { width } = useWindowDimensions();
  const ts = toneStyle(tone);
  const fadeIn = useFadeIn(delay);

  return (
    <Animated.View
      style={[
        s.metricCard,
        width < 760 && s.metricCardMobile,
        small && s.metricSmall,
        fadeIn,
      ]}
    >
      <View style={s.metricTopRow}>
        <View style={[s.metricIconBadge, ts.soft]}>
          <Icon color={ts.color} size={small ? 16 : 20} strokeWidth={2.5} />
        </View>
        <Text style={s.metricLabel}>{label}</Text>
      </View>
      <Text
        style={[
          s.metricValue,
          width < 760 && s.metricValueMobile,
          small && s.metricValueSmall,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      {/* Accent bar at bottom */}
      <View style={[s.metricAccent, { backgroundColor: ts.color }]} />
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════
   MINI CARD
   ═══════════════════════════════════════════════ */
export function MiniCard({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <View style={[s.miniCard, active && s.miniCardActive]}>
      {active && <View style={s.miniCardActiveLine} />}
      {children}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   DATA ROW — List item
   ═══════════════════════════════════════════════ */
export function DataRow({
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
    <View style={[s.dataRow, width < 760 && s.dataRowMobile]}>
      <View style={[s.dataMain, width < 760 && s.dataMainMobile]}>
        <Text style={s.itemTitle}>{title}</Text>
        {subtitle ? <Text style={s.itemSub}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={s.rowRight}>{right}</Text> : null}
      {badge ? <Badge label={badge} tone={badgeTone} /> : null}
      {actions ? <View style={s.rowActions}>{actions}</View> : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   BADGE
   ═══════════════════════════════════════════════ */
export function Badge({ label, tone = "gray" }: { label: string; tone?: Tone }) {
  const ts = toneStyle(tone);
  return (
    <View style={[s.badge, ts.soft]}>
      <Text style={[s.badgeText, { color: ts.color }]}>{label}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   FIELD — Text Input
   ═══════════════════════════════════════════════ */
export function Field({
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
    <View style={[s.fieldWrap, fullWidth && s.fieldWrapFull]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, error && s.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        aria-label={label}
      />
      {error ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

/* ═══════════════════════════════════════════════
   CHIP SELECT
   ═══════════════════════════════════════════════ */
export function ChipSelect({
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
    <View style={[s.chipWrap, compact && s.chipWrapCompact]}>
      {label ? <Text style={s.fieldLabel}>{label}</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipScroll}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={`${option.value}-${option.label}`}
              style={[s.chip, active && s.chipActive, disabled && s.disabled]}
              onPress={() => onChange(option.value)}
              disabled={disabled}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   SEGMENT BUTTON
   ═══════════════════════════════════════════════ */
export function SegmentButton({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[s.segmentButton, active && s.segmentButtonActive]} onPress={onPress}>
      <Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════
   APP BUTTON — Primary action
   ═══════════════════════════════════════════════ */
export function AppButton({
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
  const { scale, onPressIn, onPressOut } = usePressScale();

  const iconColor = isDisabled
    ? colors.faint
    : variant === "primary"
      ? "#fff"
      : colors.muted;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[
          s.button,
          s[`button_${variant}`],
          full && s.buttonFull,
          isDisabled && s.disabled,
          isDisabled && variant === "primary" && s.buttonDisabledPrimary,
        ]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : Icon ? (
          <Icon color={iconColor} size={16} strokeWidth={2.5} />
        ) : null}
        <Text
          style={[
            s.buttonText,
            variant === "primary" && !isDisabled && s.buttonTextPrimary,
            isDisabled && { color: colors.faint },
          ]}
        >
          {isLoading ? "Đang xử lý..." : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════
   ICON BUTTON
   ═══════════════════════════════════════════════ */
export function IconButton({
  icon: Icon,
  onPress,
  tone = "neutral",
}: {
  icon: IconComponent;
  onPress: () => void;
  tone?: "neutral" | "danger";
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.9);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[s.iconButton, tone === "danger" && s.iconButtonDanger]}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <Icon color={tone === "danger" ? colors.red : colors.muted} size={15} strokeWidth={2} />
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════
   NOTICE — Toast/Alert bar
   ═══════════════════════════════════════════════ */
export function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  const fadeIn = useFadeIn(0);
  return (
    <Animated.View style={[s.notice, fadeIn]}>
      <View style={s.noticeDot} />
      <Text style={s.noticeText}>{text}</Text>
      <Pressable onPress={onClose} style={s.noticeClose}>
        <X color={colors.muted} size={14} />
      </Pressable>
    </Animated.View>
  );
}

/* ═══════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════ */
export function Empty({ text }: { text: string }) {
  return (
    <View style={s.emptyWrap}>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   DONUT CHART — SVG-free circle chart
   ═══════════════════════════════════════════════ */
export function DonutSegment({
  segments,
  size = 140,
  thickness = 14,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  if (Platform.OS !== "web") {
    // Mobile fallback: simple colored bars
    return (
      <View style={s.donutFallback}>
        {segments.map((seg, i) => (
          <View key={i} style={s.donutFallbackRow}>
            <View style={[s.donutFallbackDot, { backgroundColor: seg.color }]} />
            <Text style={s.donutFallbackLabel}>{seg.label}</Text>
            <Text style={s.donutFallbackValue}>{seg.value}</Text>
          </View>
        ))}
      </View>
    );
  }

  // Web: SVG donut
  return (
    <View style={s.donutContainer}>
      <View style={{ width: size, height: size }}>
        {/* @ts-ignore — web-only SVG */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => {
            const dashLength = (seg.value / total) * circumference;
            const dashOffset = -offset;
            offset += dashLength;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transform: "rotate(-90deg)", transformOrigin: "center" } as any}
              />
            );
          })}
        </svg>
        <View style={s.donutCenter}>
          <Text style={s.donutTotal}>{total}</Text>
          <Text style={s.donutTotalLabel}>Phòng</Text>
        </View>
      </View>
      <View style={s.donutLegend}>
        {segments.map((seg, i) => (
          <View key={i} style={s.donutLegendItem}>
            <View style={[s.donutLegendDot, { backgroundColor: seg.color }]} />
            <Text style={s.donutLegendText}>{seg.label}</Text>
            <Text style={s.donutLegendValue}>{seg.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════ */
const s = StyleSheet.create({
  /* ─── Card ─── */
  card: {
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.md,
    ...(glass.light as any),
    ...(shadows.md as any),
    ...(transition as any),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  cardTitle: {
    color: colors.text,
    ...typography.h3,
  },

  /* ─── Metric Card ─── */
  metricCard: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 180,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
    position: "relative",
    ...(glass.light as any),
    ...(shadows.sm as any),
    ...(transition as any),
  },
  metricCardMobile: {
    flexBasis: "45%" as any,
    minWidth: 0,
  },
  metricSmall: {
    minWidth: 130,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  metricTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: colors.faint,
    ...typography.caption,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  metricValueSmall: {
    fontSize: 17,
  },
  metricValueMobile: {
    fontSize: 20,
  },
  metricAccent: {
    position: "absolute",
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 3,
    borderRadius: 2,
    opacity: 0.6,
  },

  /* ─── Mini Card ─── */
  miniCard: {
    minWidth: 220,
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,16,30,0.6)",
    gap: spacing.sm,
    position: "relative",
    overflow: "hidden",
    ...(transition as any),
  },
  miniCardActive: {
    borderColor: colors.primaryGlow,
    backgroundColor: "rgba(124,58,237,0.06)",
    ...(Platform.OS === "web" ? { boxShadow: "0 0 20px rgba(124,58,237,0.1)" } : {}),
  },
  miniCardActiveLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },

  /* ─── Data Row ─── */
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...(transition as any),
  },
  dataRowMobile: {
    flexWrap: "wrap",
  },
  dataMain: {
    flex: 1,
    minWidth: 0,
  },
  dataMainMobile: {
    flexBasis: "100%" as any,
  },
  itemTitle: {
    color: colors.text,
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  itemSub: {
    color: colors.muted,
    ...typography.caption,
    marginTop: 2,
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

  /* ─── Badge ─── */
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.tiny,
    letterSpacing: 0.3,
  },

  /* ─── Field ─── */
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
    color: colors.textSecondary,
    ...typography.caption,
    letterSpacing: 0.2,
  },
  input: {
    width: "100%",
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(6,8,15,0.7)",
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    ...(Platform.OS === "web" ? { outlineWidth: 0, transition: "border-color 0.2s ease, box-shadow 0.2s ease" } : {}),
  },
  inputError: {
    borderColor: colors.red,
  },
  errorText: {
    color: colors.red,
    fontSize: 11,
  },

  /* ─── Chips ─── */
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
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(6,8,15,0.5)",
    marginRight: spacing.sm,
    ...(transitionFast as any),
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    ...typography.caption,
  },
  chipTextActive: {
    color: colors.primaryLight,
  },

  /* ─── Segment ─── */
  segmentButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(15,25,50,0.4)",
    ...(transitionFast as any),
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(Platform.OS === "web" ? { boxShadow: "0 0 16px rgba(124,58,237,0.3)" } : {}),
  },
  segmentText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 13,
  },
  segmentTextActive: {
    color: "#fff",
  },

  /* ─── Buttons ─── */
  button: {
    minHeight: 42,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1,
    position: "relative",
    zIndex: 3,
    ...(transitionFast as any),
  },
  button_primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...(Platform.OS === "web" ? { boxShadow: "0 2px 12px rgba(124,58,237,0.3)" } : {}),
  },
  button_secondary: {
    backgroundColor: "rgba(15,25,50,0.5)",
    borderColor: colors.border,
  },
  button_ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },
  buttonFull: {
    width: "100%",
  },
  buttonDisabledPrimary: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderColor: "rgba(148, 163, 184, 0.15)",
    ...(Platform.OS === "web" ? { boxShadow: "none" } : {}),
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonTextPrimary: {
    color: "#fff",
  },

  /* ─── Icon Button ─── */
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(6,8,15,0.5)",
    ...(transitionFast as any),
  },
  iconButtonDanger: {
    borderColor: colors.redBg,
    backgroundColor: colors.redBg,
  },

  /* ─── Notice ─── */
  notice: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: "rgba(124,58,237,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...(glass.light as any),
  },
  noticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  noticeClose: {
    padding: spacing.xs,
  },

  /* ─── Empty ─── */
  emptyWrap: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: colors.faint,
    fontSize: 13,
    fontStyle: "italic",
  },

  /* ─── Donut Chart ─── */
  donutContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingVertical: spacing.md,
  },
  donutCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotal: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  donutTotalLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  donutLegend: {
    gap: spacing.sm,
  },
  donutLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  donutLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  donutLegendText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    minWidth: 60,
  },
  donutLegendValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  donutFallback: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  donutFallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  donutFallbackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  donutFallbackLabel: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  donutFallbackValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
} as any);
