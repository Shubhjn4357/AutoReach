import React, { createContext, useContext, useState } from "react";
import { ViewStyle, TextStyle } from "react-native";

export type ThemeType = "light" | "dark";

export interface ThemeColors {
  bg: string;
  bgGradientStart: string;
  bgGradientEnd: string;
  surface: string;
  card: string;
  cardInner: string; // inner shadow simulate
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  accent: string;
  accentSoft: string;
  // Clay specific
  clayBase: string;
  clayShadowDark: string;
  clayShadowLight: string;
}

export interface ThemeContextProps {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: ThemeColors;
  clayStyle: ViewStyle;
  clayInputStyle: ViewStyle & TextStyle;
  clayCardStyle: ViewStyle;
  // Legacy support
  glassStyle: ViewStyle;
  glassInputStyle: ViewStyle & TextStyle;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  toggleTheme: () => {},
  colors: {} as ThemeColors,
  clayStyle: {},
  clayInputStyle: {},
  clayCardStyle: {},
  glassStyle: {},
  glassInputStyle: {},
});

export const useTheme = () => useContext(ThemeContext);

// Claymorphism - Light: Soft pastel backdrop with puffy clay cards
const lightColors: ThemeColors = {
  bg: "#EEF0FF",
  bgGradientStart: "#E8EEFF",
  bgGradientEnd: "#F5EEFF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardInner: "#F0F2FF",
  border: "rgba(100, 100, 200, 0.12)",
  text: "#1E1B4B",
  textSecondary: "#4C4980",
  textMuted: "#8B88B8",
  primary: "#6366F1",
  primarySoft: "#EEF2FF",
  success: "#10B981",
  successSoft: "#D1FAE5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#F43F5E",
  dangerSoft: "#FFE4E6",
  accent: "#A78BFA",
  accentSoft: "#EDE9FE",
  clayBase: "#FFFFFF",
  clayShadowDark: "rgba(130, 120, 200, 0.25)",
  clayShadowLight: "rgba(255, 255, 255, 0.9)",
};

// Claymorphism - Dark: Deep muted with vibrant clay accent pops
const darkColors: ThemeColors = {
  bg: "#1A1B2E",
  bgGradientStart: "#1A1B2E",
  bgGradientEnd: "#16172A",
  surface: "#242538",
  card: "#2A2B42",
  cardInner: "#1E1F32",
  border: "rgba(150, 140, 255, 0.15)",
  text: "#F1F0FF",
  textSecondary: "#A9A7D4",
  textMuted: "#6B69A0",
  primary: "#818CF8",
  primarySoft: "rgba(129,140,248,0.18)",
  success: "#34D399",
  successSoft: "rgba(52,211,153,0.18)",
  warning: "#FBBF24",
  warningSoft: "rgba(251,191,36,0.18)",
  danger: "#FB7185",
  dangerSoft: "rgba(251,113,133,0.18)",
  accent: "#C4B5FD",
  accentSoft: "rgba(196,181,253,0.18)",
  clayBase: "#2A2B42",
  clayShadowDark: "rgba(0, 0, 0, 0.5)",
  clayShadowLight: "rgba(100, 90, 180, 0.12)",
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<ThemeType>("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const colors = theme === "dark" ? darkColors : lightColors;
  const isDark = theme === "dark";

  // Claymorphism card - puffy, rounded, multi-layer shadow
  const clayCardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 16,
    // Outer shadow (below)
    shadowColor: colors.clayShadowDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: isDark ? 0.7 : 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: isDark
      ? "rgba(150,140,255,0.12)"
      : "rgba(255,255,255,0.95)",
  };

  // Primary clay surface (panels, containers)
  const clayStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    shadowColor: colors.clayShadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.6 : 0.3,
    shadowRadius: 20,
    elevation: 14,
    borderWidth: 1.5,
    borderColor: isDark
      ? "rgba(150,140,255,0.15)"
      : "rgba(255,255,255,0.98)",
  };

  // Clay input field
  const clayInputStyle: ViewStyle & TextStyle = {
    backgroundColor: isDark ? colors.cardInner : "#F4F5FF",
    borderWidth: 1.5,
    borderColor: isDark ? "rgba(150,140,255,0.2)" : "rgba(100,100,200,0.15)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    shadowColor: colors.clayShadowDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        colors,
        clayStyle,
        clayInputStyle,
        clayCardStyle,
        glassStyle: clayStyle,         // legacy alias
        glassInputStyle: clayInputStyle, // legacy alias
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
