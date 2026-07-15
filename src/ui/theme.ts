import { Platform } from "react-native";

/* ─── Aurora Color Palette ─── */
export const colors = {
  /* Backgrounds */
  bg: "#06080f",
  bgSubtle: "#0a0e1a",
  panel: "#0c1220",
  card: "rgba(15, 25, 50, 0.45)",
  cardHover: "rgba(20, 32, 65, 0.55)",
  cardSolid: "#111b33",

  /* Borders */
  border: "rgba(255, 255, 255, 0.08)",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  borderFocus: "rgba(124, 58, 237, 0.5)",

  /* Text */
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  muted: "#94a3b8",
  faint: "#475569",
  textOnPrimary: "#ffffff",

  /* Primary — Violet Aurora */
  primary: "#7C3AED",
  primaryLight: "#8B5CF6",
  primaryDark: "#6D28D9",
  primarySoft: "rgba(124, 58, 237, 0.15)",
  primaryGlow: "rgba(124, 58, 237, 0.25)",

  /* Accent — Cyan Aurora */
  accent: "#06B6D4",
  accentLight: "#22D3EE",
  accentSoft: "rgba(6, 182, 212, 0.15)",

  /* Semantic */
  green: "#10B981",
  greenBg: "rgba(16, 185, 129, 0.12)",
  amber: "#F59E0B",
  amberBg: "rgba(245, 158, 11, 0.12)",
  red: "#EF4444",
  redBg: "rgba(239, 68, 68, 0.12)",
  blue: "#3B82F6",
  blueBg: "rgba(59, 130, 246, 0.12)",
  teal: "#14B8A6",
  tealBg: "rgba(20, 184, 166, 0.12)",
  purple: "#D946EF",
  purpleBg: "rgba(217, 70, 239, 0.12)",

  /* Aurora gradient colors */
  aurora1: "#7C3AED",
  aurora2: "#06B6D4",
  aurora3: "#EC4899",
};

/* ─── Spacing Scale ─── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

/* ─── Border Radius ─── */
export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

/* ─── Typography ─── */
export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const },
  h2: { fontSize: 22, fontWeight: "700" as const },
  h3: { fontSize: 16, fontWeight: "700" as const },
  body: { fontSize: 14, fontWeight: "400" as const },
  bodyMedium: { fontSize: 14, fontWeight: "500" as const },
  caption: { fontSize: 12, fontWeight: "600" as const },
  tiny: { fontSize: 10, fontWeight: "700" as const },
};

/* ─── Shadows (web-only, via boxShadow) ─── */
export const shadows = {
  sm: Platform.OS === "web"
    ? { boxShadow: "0 2px 8px rgba(0,0,0,0.2), 0 0 1px rgba(124,58,237,0.1)" }
    : {},
  md: Platform.OS === "web"
    ? { boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 0 1px rgba(124,58,237,0.15)" }
    : {},
  lg: Platform.OS === "web"
    ? { boxShadow: "0 8px 40px rgba(0,0,0,0.35), 0 0 2px rgba(124,58,237,0.2)" }
    : {},
  glow: Platform.OS === "web"
    ? { boxShadow: "0 0 30px rgba(124,58,237,0.15), 0 4px 20px rgba(0,0,0,0.2)" }
    : {},
  glowAccent: Platform.OS === "web"
    ? { boxShadow: "0 0 30px rgba(6,182,212,0.12), 0 4px 20px rgba(0,0,0,0.2)" }
    : {},
};

/* ─── Glass helpers ─── */
export const glass = {
  light: Platform.OS === "web"
    ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
    : {},
  medium: Platform.OS === "web"
    ? { backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }
    : {},
  heavy: Platform.OS === "web"
    ? { backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)" }
    : {},
};

/* ─── Transition (web-only) ─── */
export const transition = Platform.OS === "web"
  ? { transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" }
  : {};

export const transitionFast = Platform.OS === "web"
  ? { transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)" }
  : {};

/* ─── Utilities ─── */
export const formatMoney = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;

export const currentMonth = new Date().getMonth() + 1;
export const currentYear = new Date().getFullYear();
