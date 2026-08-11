import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type PartnerTheme = {
  isDark: boolean;
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    primary: string;
    primaryDark: string;
    border: string;
  };
};

const light: PartnerTheme = {
  isDark: false,
  colors: {
    background: "#F4F8FF",
    card: "#FFFFFF",
    text: "#123456",
    muted: "#5E7897",
    primary: "#60A5FA",
    primaryDark: "#143A66",
    border: "#D9E6F7"
  }
};

const dark: PartnerTheme = {
  isDark: true,
  colors: {
    background: "#0B1220",
    card: "#111827",
    text: "#F8FBFF",
    muted: "#9FB0C5",
    primary: "#60A5FA",
    primaryDark: "#E5EDF7",
    border: "#263449"
  }
};

type Ctx = {
  theme: PartnerTheme;
  isDarkMode: boolean;
  setDarkMode: (v: boolean) => void;
};

const PartnerThemeContext = createContext<Ctx | null>(null);

export function PartnerThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setDarkMode] = useState(() => localStorage.getItem("partner_dark") === "1");

  useEffect(() => {
    localStorage.setItem("partner_dark", isDarkMode ? "1" : "0");
    document.documentElement.dataset.partnerTheme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  const value = useMemo(
    () => ({ theme: isDarkMode ? dark : light, isDarkMode, setDarkMode }),
    [isDarkMode]
  );

  return <PartnerThemeContext.Provider value={value}>{children}</PartnerThemeContext.Provider>;
}

export const usePartnerTheme = () => {
  const ctx = useContext(PartnerThemeContext);
  if (!ctx) throw new Error("PartnerThemeProvider missing");
  return ctx;
};
