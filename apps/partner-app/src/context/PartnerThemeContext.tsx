import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  PARTNER_THEME_STORAGE_KEY,
  partnerDarkTheme,
  partnerLightTheme,
  type PartnerTheme
} from "../theme";

type PartnerThemeContextValue = {
  theme: PartnerTheme;
  isDarkMode: boolean;
  setDarkMode: (enabled: boolean) => Promise<void>;
};

const PartnerThemeContext = createContext<PartnerThemeContextValue>({
  theme: partnerLightTheme,
  isDarkMode: false,
  setDarkMode: async () => undefined
});

export function PartnerThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PARTNER_THEME_STORAGE_KEY)
      .then((value) => setIsDarkMode(value === "true"))
      .catch(() => undefined);
  }, []);

  const setDarkMode = async (enabled: boolean) => {
    setIsDarkMode(enabled);
    await AsyncStorage.setItem(PARTNER_THEME_STORAGE_KEY, enabled ? "true" : "false");
  };

  const value = useMemo(
    () => ({
      theme: isDarkMode ? partnerDarkTheme : partnerLightTheme,
      isDarkMode,
      setDarkMode
    }),
    [isDarkMode]
  );

  return <PartnerThemeContext.Provider value={value}>{children}</PartnerThemeContext.Provider>;
}

export const usePartnerTheme = () => useContext(PartnerThemeContext);
