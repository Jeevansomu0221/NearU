export const PARTNER_THEME_STORAGE_KEY = "partner-app:dark-mode";

export const partnerLightTheme = {
  colors: {
    background: "#F4F8FF",
    card: "#FFFFFF",
    surface: "#F9FCFF",
    border: "#D9E6F7",
    borderSoft: "#E6EEF9",
    primary: "#60A5FA",
    primaryDark: "#143A66",
    muted: "#5E7897",
    mutedDark: "#355877",
    text: "#123456",
    success: "#10B981",
    successSoft: "#ECFDF5",
    warning: "#EA580C",
    warningSoft: "#FFF6ED",
    danger: "#B42318",
    dangerSoft: "#FDECEC",
    neutralSoft: "#ECF4FF"
  }
} as const;

export const partnerDarkTheme = {
  colors: {
    background: "#0B1220",
    card: "#111827",
    surface: "#0F172A",
    border: "#263449",
    borderSoft: "#1F2A3A",
    primary: "#60A5FA",
    primaryDark: "#E5EDF7",
    muted: "#9FB0C5",
    mutedDark: "#C8D3E1",
    text: "#F8FBFF",
    success: "#10B981",
    successSoft: "#12382C",
    warning: "#F59E0B",
    warningSoft: "#3B2A12",
    danger: "#F87171",
    dangerSoft: "#3B171C",
    neutralSoft: "#1D2A3D"
  }
} as const;

export type PartnerTheme = typeof partnerLightTheme | typeof partnerDarkTheme;

export const partnerTheme = partnerLightTheme;
