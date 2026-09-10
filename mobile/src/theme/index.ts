/** Brand tokens — mirrors tailwind.config.ts on the web so the app stays visually consistent. */
export const colors = {
  primary: "#4A6741", // Deep Forest Green
  secondary: "#C68E5D", // Earthy Brown/Terracotta
  accent: "#FDFCF8", // Beige/Sand
  text: "#2C3E32", // Dark Charcoal
  background: "#FDFCF8",
  white: "#FFFFFF",
  border: "#E7E2D6",
  muted: "#8A8F86",
  danger: "#C0392B",
  warning: "#C68E5D",
  success: "#4A6741",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  control: 10,
  card: 16,
  pill: 999,
} as const;

export const font = {
  serifWeight: "700" as const,
  sansWeight: "400" as const,
};
