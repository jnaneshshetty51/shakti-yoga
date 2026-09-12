/** Brand tokens — mirrors tailwind.config.ts on the web and provides a serene, premium wellness aesthetic. */
export const colors = {
  primary: "#2D4739", // Deep Forest Green (Luxury & Serenity)
  primaryHover: "#233A2D",
  primaryLight: "#4A6741",
  secondary: "#C68E5D", // Earthy Terracotta / Warm Ochre
  secondaryLight: "#F5ECE1",
  accent: "#FAF8F5", // Warm Alabaster / Sand
  sage: "#EAF1E8", // Soft Sage Mist
  sageText: "#2C5135",
  text: "#1D2B21", // Dark Forest Charcoal
  textMuted: "#6B7569",
  background: "#FAF8F5",
  surface: "#FFFFFF",
  white: "#FFFFFF",
  border: "#E9E4D9",
  borderLight: "#F2EFE8",
  muted: "#7F897D",
  danger: "#C0392B",
  dangerLight: "#FDEEEC",
  warning: "#C68E5D",
  warningLight: "#FBF3EA",
  success: "#2D4739",
  successLight: "#EAF1E8",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  control: 12,
  card: 18,
  pill: 999,
} as const;

export const shadows = {
  subtle: {
    shadowColor: "#1D2B21",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: "#1D2B21",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  floating: {
    shadowColor: "#1D2B21",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
} as const;

export const font = {
  serifWeight: "700" as const,
  sansWeight: "400" as const,
  mediumWeight: "600" as const,
};
