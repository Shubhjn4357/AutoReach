import React, { createContext, useContext, useState } from "react";
import {
  StyleSheet,
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
} from "react-native";
import { Link as RouterLink } from "expo-router";

// Theme Definition
export type ThemeType = "light" | "dark";

export const ThemeContext = createContext<{
  theme: ThemeType;
  toggleTheme: () => void;
  colors: Record<string, string>;
}>({
  theme: "dark",
  toggleTheme: () => {},
  colors: {},
});

export const useTheme = () => useContext(ThemeContext);

const darkColors = {
  bg: "#050505",
  surface: "#111111",
  card: "#171717",
  border: "#2A2A2A",
  text: "#FFFFFF",
  textSecondary: "#A0A0A0",
  textMuted: "#666666",
  primary: "#5E6BFF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  accent: "#30D5C8",
};

const lightColors = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E2E8F0",
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

  return React.createElement(ThemeContext.Provider, {
    value: { theme, toggleTheme, colors },
    children
  });
};

// Static Tailwind classes mapping (Layout, Gap, Dimensions, Borders, Rounding, Typography)
const themeStyles = StyleSheet.create({
  // flex / layout
  "flex-1": { flex: 1 },
  "flex-row": { flexDirection: "row" },
  "flex-col": { flexDirection: "column" },
  "flex-center": { justifyContent: "center", alignItems: "center" },
  "justify-between": { justifyContent: "space-between" },
  "justify-center": { justifyContent: "center" },
  "items-center": { alignItems: "center" },
  "items-end": { alignItems: "flex-end" },
  "items-start": { alignItems: "flex-start" },
  
  // gaps
  "gap-1": { gap: 4 },
  "gap-1.5": { gap: 6 },
  "gap-2": { gap: 8 },
  "gap-3": { gap: 12 },
  "gap-4": { gap: 16 },
  "gap-6": { gap: 24 },

  // dimensions
  "w-4": { width: 16 },
  "w-5": { width: 20 },
  "w-6": { width: 24 },
  "w-12": { width: 48 },
  "w-full": { width: "100%" },
  "h-4": { height: 16 },
  "h-5": { height: 20 },
  "h-6": { height: 24 },
  "h-12": { height: 48 },

  // margins
  "mb-1": { marginBottom: 4 },
  "mb-2": { marginBottom: 8 },
  "mb-3": { marginBottom: 12 },
  "mb-4": { marginBottom: 16 },
  "mb-6": { marginBottom: 24 },
  "mb-10": { marginBottom: 40 },
  "mt-0.5": { marginTop: 2 },
  "mt-1": { marginTop: 4 },
  "mt-2": { marginTop: 8 },
  "mt-4": { marginTop: 16 },
  "mr-2": { marginRight: 8 },
  "mr-3": { marginRight: 12 },
  "ml-2": { marginLeft: 8 },

  // padding
  "p-1": { padding: 4 },
  "p-2": { padding: 8 },
  "p-2.5": { padding: 10 },
  "p-3": { padding: 12 },
  "p-4": { padding: 16 },
  "p-5": { padding: 20 },
  "p-6": { padding: 24 },
  "pb-2": { paddingBottom: 8 },
  "pb-4": { paddingBottom: 16 },
  "pt-2": { paddingTop: 8 },
  "pt-3": { paddingTop: 12 },
  "pt-4": { paddingTop: 16 },
  "pr-4": { paddingRight: 16 },
  "px-2": { paddingHorizontal: 8 },
  "px-2.5": { paddingHorizontal: 10 },
  "px-3": { paddingHorizontal: 12 },
  "px-3.5": { paddingHorizontal: 14 },
  "px-4": { paddingHorizontal: 16 },
  "px-6": { paddingHorizontal: 24 },
  "py-1": { paddingVertical: 4 },
  "py-1.5": { paddingVertical: 6 },
  "py-2": { paddingVertical: 8 },
  "py-3": { paddingVertical: 12 },
  "py-4": { paddingVertical: 16 },
  "py-6": { paddingVertical: 24 },

  // borders (shared base properties)
  "border": { borderWidth: 1 },
  "border-2": { borderWidth: 2 },
  "border-b": { borderBottomWidth: 1 },
  "border-t": { borderTopWidth: 1 },

  // typography
  "text-3xs": { fontSize: 10 },
  "text-2xs": { fontSize: 11 },
  "text-xs": { fontSize: 12 },
  "text-sm": { fontSize: 14 },
  "text-base": { fontSize: 16 },
  "text-lg": { fontSize: 18 },
  "text-xl": { fontSize: 20 },
  "text-2xl": { fontSize: 24 },
  "text-3xl": { fontSize: 30 },
  
  "font-black": { fontWeight: "900" },
  "font-bold": { fontWeight: "bold" },
  "font-semibold": { fontWeight: "600" },
  
  "italic": { fontStyle: "italic" },
  "underline": { textDecorationLine: "underline" },
  "line-through": { textDecorationLine: "line-through" },
  "tracking-tight": { letterSpacing: -0.5 },

  // rounded curved corners
  "rounded": { borderRadius: 4 },
  "rounded-md": { borderRadius: 8 },
  "rounded-lg": { borderRadius: 12 },
  "rounded-xl": { borderRadius: 20 },  // Highly curved borders
  "rounded-2xl": { borderRadius: 24 }, // Extra curved corners
  "rounded-full": { borderRadius: 9999 },
});

// Dynamic theme color mapper
const themeColorStyles = {
  dark: {
    // backgrounds
    "bg-bg": { backgroundColor: "#050505" },
    "bg-surface": { backgroundColor: "#111111" },
    "bg-card": { backgroundColor: "#171717" },
    "bg-primary": { backgroundColor: "#5E6BFF" },
    "bg-primary/5": { backgroundColor: "rgba(94, 107, 255, 0.05)" },
    "bg-primary/10": { backgroundColor: "rgba(94, 107, 255, 0.1)" },
    "bg-primary/20": { backgroundColor: "rgba(94, 107, 255, 0.2)" },
    "bg-success": { backgroundColor: "#22C55E" },
    "bg-success/20": { backgroundColor: "rgba(34, 197, 94, 0.2)" },
    "bg-warning/10": { backgroundColor: "rgba(245, 158, 11, 0.1)" },
    "bg-warning/20": { backgroundColor: "rgba(245, 158, 11, 0.2)" },
    "bg-danger/10": { backgroundColor: "rgba(239, 68, 68, 0.1)" },
    "bg-danger/20": { backgroundColor: "rgba(239, 68, 68, 0.2)" },

    // borders
    "border-border": { borderColor: "#2A2A2A" },
    "border-border/40": { borderColor: "rgba(42, 42, 42, 0.4)" },
    "border-border/50": { borderColor: "rgba(42, 42, 42, 0.5)" },
    "border-primary": { borderColor: "#5E6BFF" },
    "border-primary/20": { borderColor: "rgba(94, 107, 255, 0.2)" },
    "border-primary/30": { borderColor: "rgba(94, 107, 255, 0.3)" },
    "border-primary/40": { borderColor: "rgba(94, 107, 255, 0.4)" },
    "border-primary/50": { borderColor: "rgba(94, 107, 255, 0.5)" },
    "border-success": { borderColor: "#22C55E" },
    "border-success/40": { borderColor: "rgba(34, 197, 94, 0.4)" },
    "border-warning/30": { borderColor: "rgba(245, 158, 11, 0.3)" },
    "border-danger/20": { borderColor: "rgba(239, 68, 68, 0.2)" },
    "border-danger/40": { borderColor: "rgba(239, 68, 68, 0.4)" },

    // text colors
    "text-white": { color: "#FFFFFF" },
    "text-primary": { color: "#5E6BFF" },
    "text-accent": { color: "#30D5C8" },
    "text-success": { color: "#22C55E" },
    "text-warning": { color: "#F59E0B" },
    "text-danger": { color: "#EF4444" },
    "text-text-secondary": { color: "#A0A0A0" },
    "text-text-muted": { color: "#666666" },
  },
  light: {
    // backgrounds
    "bg-bg": { backgroundColor: "#F8FAFC" },
    "bg-surface": { backgroundColor: "#FFFFFF" },
    "bg-card": { backgroundColor: "#FFFFFF" },
    "bg-primary": { backgroundColor: "#5E6BFF" },
    "bg-primary/5": { backgroundColor: "rgba(94, 107, 255, 0.05)" },
    "bg-primary/10": { backgroundColor: "rgba(94, 107, 255, 0.1)" },
    "bg-primary/20": { backgroundColor: "rgba(94, 107, 255, 0.2)" },
    "bg-success": { backgroundColor: "#16A34A" },
    "bg-success/20": { backgroundColor: "rgba(22, 163, 74, 0.15)" },
    "bg-warning/10": { backgroundColor: "rgba(217, 119, 6, 0.1)" },
    "bg-warning/20": { backgroundColor: "rgba(217, 119, 6, 0.18)" },
    "bg-danger/10": { backgroundColor: "rgba(220, 38, 38, 0.1)" },
    "bg-danger/20": { backgroundColor: "rgba(220, 38, 38, 0.18)" },

    // borders
    "border-border": { borderColor: "#E2E8F0" },
    "border-border/40": { borderColor: "rgba(226, 232, 240, 0.4)" },
    "border-border/50": { borderColor: "rgba(226, 232, 240, 0.5)" },
    "border-primary": { borderColor: "#5E6BFF" },
    "border-primary/20": { borderColor: "rgba(94, 107, 255, 0.2)" },
    "border-primary/30": { borderColor: "rgba(94, 107, 255, 0.3)" },
    "border-primary/40": { borderColor: "rgba(94, 107, 255, 0.4)" },
    "border-primary/50": { borderColor: "rgba(94, 107, 255, 0.5)" },
    "border-success": { borderColor: "#16A34A" },
    "border-success/40": { borderColor: "rgba(22, 163, 74, 0.4)" },
    "border-warning/30": { borderColor: "rgba(217, 119, 6, 0.3)" },
    "border-danger/20": { borderColor: "rgba(220, 38, 38, 0.2)" },
    "border-danger/40": { borderColor: "rgba(220, 38, 38, 0.4)" },

    // text colors
    "text-white": { color: "#0F172A" },
    "text-primary": { color: "#5E6BFF" },
    "text-accent": { color: "#0D9488" },
    "text-success": { color: "#16A34A" },
    "text-warning": { color: "#D97706" },
    "text-danger": { color: "#DC2626" },
    "text-text-secondary": { color: "#475569" },
    "text-text-muted": { color: "#94A3B8" },
  }
};

function resolveClassName(className: string | undefined, theme: ThemeType): any[] {
  if (!className) return [];
  const activeColorStyles = themeColorStyles[theme];
  return className
    .split(/\s+/)
    .map((cls) => {
      const trimmed = cls.trim();
      if (!trimmed) return null;
      if (trimmed in activeColorStyles) {
        return activeColorStyles[trimmed as keyof typeof activeColorStyles];
      }
      if (trimmed in themeStyles) {
        return themeStyles[trimmed as keyof typeof themeStyles];
      }
      // Shadow override based on theme
      if (trimmed === "shadow-2xl") {
        return {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: theme === "dark" ? 0.45 : 0.08,
          shadowRadius: 16.00,
          elevation: 24,
        };
      }
      return null;
    })
    .filter(Boolean);
}

export const useCSSVariable = (variable: string) => {
  const { colors } = useTheme();
  const vars: Record<string, string> = {
    "--color-primary": colors.primary,
    "--color-secondary": "#7C5CFF",
    "--color-accent": colors.accent,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-danger": colors.danger,
    "--color-bg": colors.bg,
    "--color-surface": colors.surface,
    "--color-card": colors.card,
    "--color-border": colors.border,
    "--color-text-primary": colors.text,
    "--color-text-secondary": colors.textSecondary,
  };
  return vars[variable] || "";
};

export const View = React.forwardRef<RNView, React.ComponentPropsWithoutRef<typeof RNView> & { className?: string }>(
  ({ className, style, ...props }, ref) => {
    const { theme } = useTheme();
    return React.createElement(RNView, {
      ref,
      style: [resolveClassName(className, theme), style],
      ...props
    });
  }
);
View.displayName = "CSS(View)";

export const Text = React.forwardRef<RNText, React.ComponentPropsWithoutRef<typeof RNText> & { className?: string }>(
  ({ className, style, ...props }, ref) => {
    const { theme } = useTheme();
    return React.createElement(RNText, {
      ref,
      style: [resolveClassName(className, theme), style],
      ...props
    });
  }
);
Text.displayName = "CSS(Text)";

export const ScrollView = React.forwardRef<
  RNScrollView,
  React.ComponentPropsWithoutRef<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
>(({ className, contentContainerClassName, style, contentContainerStyle, ...props }, ref) => {
  const { theme } = useTheme();
  return React.createElement(RNScrollView, {
    ref,
    style: [resolveClassName(className, theme), style],
    contentContainerStyle: [resolveClassName(contentContainerClassName, theme), contentContainerStyle],
    ...props
  });
});
ScrollView.displayName = "CSS(ScrollView)";

export const Pressable = React.forwardRef<
  any,
  React.ComponentPropsWithoutRef<typeof RNPressable> & { className?: string }
>(({ className, style, ...props }, ref) => {
  const { theme } = useTheme();
  return React.createElement(RNPressable, {
    ref,
    style: (state: any) => [
      resolveClassName(className, theme),
      typeof style === "function" ? style(state) : style,
    ] as any,
    ...props
  });
});
Pressable.displayName = "CSS(Pressable)";

export const TextInput = React.forwardRef<
  RNTextInput,
  React.ComponentPropsWithoutRef<typeof RNTextInput> & { className?: string }
>(({ className, style, ...props }, ref) => {
  const { theme, colors } = useTheme();
  return React.createElement(RNTextInput, {
    ref,
    style: [
      { color: colors.text },
      resolveClassName(className, theme),
      style
    ],
    placeholderTextColor: colors.textMuted,
    ...props
  });
});
TextInput.displayName = "CSS(TextInput)";

export const Link = ({ className, style, ...props }: React.ComponentPropsWithoutRef<typeof RouterLink> & { className?: string }) => {
  const { theme } = useTheme();
  return React.createElement(RouterLink, {
    style: [resolveClassName(className, theme), style] as any,
    ...props
  });
};
Link.displayName = "CSS(Link)";
