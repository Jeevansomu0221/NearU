export const PARTNER_THEME_STORAGE_KEY = "partner-app:dark-mode";

export const partnerLightTheme = {
  colors: {
    background: "#F7FAFF",
    card: "#FFFFFF",
    surface: "#FBFDFF",
    border: "#E3EDF8",
    borderSoft: "#EEF4FB",
    primary: "#7BB8FC",
    primaryDark: "#2A5580",
    muted: "#6B849E",
    mutedDark: "#4A6B8A",
    text: "#1A4568",
    success: "#34D399",
    successSoft: "#ECFDF5",
    warning: "#FB923C",
    warningSoft: "#FFF7ED",
    danger: "#F87171",
    dangerSoft: "#FEF2F2",
    neutralSoft: "#F0F6FF"
  }
} as const;

export const partnerDarkTheme = {
  colors: {
    background: "#0B1220",
    card: "#111827",
    surface: "#0F172A",
    border: "#263449",
    borderSoft: "#1F2A3A",
    primary: "#7BB8FC",
    primaryDark: "#E5EDF7",
    muted: "#9FB0C5",
    mutedDark: "#C8D3E1",
    text: "#F8FBFF",
    success: "#34D399",
    successSoft: "#12382C",
    warning: "#FBBF24",
    warningSoft: "#3B2A12",
    danger: "#F87171",
    dangerSoft: "#3B171C",
    neutralSoft: "#1D2A3D"
  }
} as const;

export type PartnerTheme = typeof partnerLightTheme | typeof partnerDarkTheme;

export const partnerTheme = partnerLightTheme;
