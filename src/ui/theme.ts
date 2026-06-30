export const colors = {
  bg: "#09101d",
  panel: "#0e1628",
  card: "rgba(22, 33, 55, 0.7)",
  cardSoft: "rgba(22, 33, 55, 0.4)",
  border: "rgba(255, 255, 255, 0.15)",
  borderSoft: "rgba(255, 255, 255, 0.06)",
  text: "#f8fafc",
  muted: "#94a3b8",
  faint: "#475569",
  primary: "#F59E0B", // Vàng Cung Đình
  primarySoft: "rgba(245, 158, 11, 0.15)",
  green: "#10B981", // Lục bảo
  greenBg: "rgba(16, 185, 129, 0.15)",
  amber: "#F59E0B",
  amberBg: "rgba(245, 158, 11, 0.15)",
  red: "#EF4444",
  redBg: "rgba(239, 68, 68, 0.15)",
  blue: "#3B82F6",
  blueBg: "rgba(59, 130, 246, 0.15)",
  teal: "#14B8A6",
  tealBg: "rgba(20, 184, 166, 0.15)",
  purple: "#D946EF", // Hồng sen
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const formatMoney = (value?: number | null) =>
  `${Number(value ?? 0).toLocaleString("vi-VN")} ₫`;

export const currentMonth = new Date().getMonth() + 1;
export const currentYear = new Date().getFullYear();

