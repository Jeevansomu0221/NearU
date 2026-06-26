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
    background: "#f6f3ef",
    card: "#ffffff",
    text: "#1f1f1f",
    muted: "#6b6b6b",
    primary: "#ff6b35",
    primaryDark: "#c94f24",
    border: "#e8dfd7"
  }
};

const dark: PartnerTheme = {
  isDark: true,
  colors: {
    background: "#121212",
    card: "#1e1e1e",
    text: "#f5f5f5",
    muted: "#a0a0a0",
    primary: "#ff8a5c",
    primaryDark: "#ff6b35",
    border: "#333"
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
