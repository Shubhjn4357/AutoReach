import React, { createContext, useContext, useState } from "react";
import { ViewStyle, TextStyle } from "react-native";

export type ThemeType = "light" | "dark";

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
}

export interface ThemeContextProps {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: ThemeColors;
  glassStyle: ViewStyle;
  glassInputStyle: ViewStyle & TextStyle;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "dark",
  toggleTheme: () => {},
  colors: {} as ThemeColors,
  glassStyle: {},
  glassInputStyle: {},
});

export const useTheme = () => useContext(ThemeContext);

const darkColors: ThemeColors = {
  bg: "#050505",
  surface: "rgba(17, 17, 17, 0.8)",
  card: "rgba(23, 23, 23, 0.7)",
  border: "rgba(255, 255, 255, 0.15)",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#666666",
  primary: "#5E6BFF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  accent: "#30D5C8",
};

const lightColors: ThemeColors = {
  bg: "#F8FAFC",
  surface: "rgba(255, 255, 255, 0.85)",
  card: "rgba(255, 255, 255, 0.75)",
  border: "rgba(15, 23, 42, 0.15)",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  primary: "#5E6BFF",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  accent: "#0D9488",
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>("dark");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const colors = theme === "dark" ? darkColors : lightColors;

  const glassStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme === "dark" ? 0.35 : 0.08,
    shadowRadius: 12,
    elevation: 8,
  };

  const glassInputStyle: ViewStyle & TextStyle = {
    backgroundColor: theme === "dark" ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.8)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors, glassStyle, glassInputStyle }}>
      {children}
    </ThemeContext.Provider>
  );
};
