import React from "react";
import {
  StyleSheet,
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
} from "react-native";
import { Link as RouterLink } from "expo-router";

// Predefined styles matching Tailwind classes used in the project
const twStyles = StyleSheet.create({
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
  "gap-1.5": { gap: 6 },
  "gap-2": { gap: 8 },
  "gap-3": { gap: 12 },
  "gap-4": { gap: 16 },

  // dimensions
  "w-5": { width: 20 },
  "w-12": { width: 48 },
  "h-5": { height: 20 },
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
  "mt-4": { marginTop: 16 },

  // padding
  "p-1": { padding: 4 },
  "p-2": { padding: 8 },
  "p-2.5": { padding: 10 },
  "p-3": { padding: 12 },
  "p-4": { padding: 16 },
  "p-5": { padding: 20 },
  "pb-2": { paddingBottom: 8 },
  "pt-3": { paddingTop: 12 },
  "pr-4": { paddingRight: 16 },
  "px-2": { paddingHorizontal: 8 },
  "px-2.5": { paddingHorizontal: 10 },
  "px-3": { paddingHorizontal: 12 },
  "px-3.5": { paddingHorizontal: 14 },
  "px-4": { paddingHorizontal: 16 },
  "py-1": { paddingVertical: 4 },
  "py-1.5": { paddingVertical: 6 },
  "py-2": { paddingVertical: 8 },
  "py-6": { paddingVertical: 24 },

  // borders
  "border": { borderWidth: 1, borderColor: "#2A2A2A" },
  "border-2": { borderWidth: 2, borderColor: "#2A2A2A" },
  "border-b": { borderBottomWidth: 1, borderBottomColor: "#2A2A2A" },
  "border-t": { borderTopWidth: 1, borderTopColor: "#2A2A2A" },
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

  // text colors
  "text-white": { color: "#FFFFFF" },
  "text-primary": { color: "#5E6BFF" },
  "text-accent": { color: "#30D5C8" },
  "text-success": { color: "#22C55E" },
  "text-warning": { color: "#F59E0B" },
  "text-danger": { color: "#EF4444" },
  "text-text-secondary": { color: "#A0A0A0" },
  "text-text-muted": { color: "#666666" },

  // typography
  "text-3xs": { fontSize: 10 },
  "text-2xs": { fontSize: 11 },
  "text-xs": { fontSize: 12 },
  "text-sm": { fontSize: 14 },
  "text-base": { fontSize: 16 },
  "text-lg": { fontSize: 18 },
  "text-xl": { fontSize: 20 },
  "text-2xl": { fontSize: 24 },
  
  "font-black": { fontWeight: "900" },
  "font-bold": { fontWeight: "bold" },
  "font-semibold": { fontWeight: "600" },
  
  "italic": { fontStyle: "italic" },
  "underline": { textDecorationLine: "underline" },
  "line-through": { textDecorationLine: "line-through" },
  "tracking-tight": { letterSpacing: -0.5 },

  // shadow
  "shadow-2xl": {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.58,
    shadowRadius: 16.00,
    elevation: 24,
  },
});

function resolveClassName(className: string | undefined): any[] {
  if (!className) return [];
  return className
    .split(/\s+/)
    .map((cls) => {
      const trimmed = cls.trim();
      if (!trimmed) return null;
      if (trimmed in twStyles) {
        return twStyles[trimmed as keyof typeof twStyles];
      }
      return null;
    })
    .filter(Boolean);
}

export const useCSSVariable = (variable: string) => {
  const vars: Record<string, string> = {
    "--color-primary": "#5E6BFF",
    "--color-secondary": "#7C5CFF",
    "--color-accent": "#30D5C8",
    "--color-success": "#22C55E",
    "--color-warning": "#F59E0B",
    "--color-danger": "#EF4444",
    "--color-bg": "#050505",
    "--color-surface": "#111111",
    "--color-card": "#171717",
    "--color-border": "#2A2A2A",
    "--color-text-primary": "#FFFFFF",
    "--color-text-secondary": "#A0A0A0",
  };
  return vars[variable] || "";
};

export const View = React.forwardRef<RNView, React.ComponentPropsWithoutRef<typeof RNView> & { className?: string }>(
  ({ className, style, ...props }, ref) => {
    return React.createElement(RNView, {
      ref,
      style: [resolveClassName(className), style],
      ...props
    });
  }
);
View.displayName = "CSS(View)";

export const Text = React.forwardRef<RNText, React.ComponentPropsWithoutRef<typeof RNText> & { className?: string }>(
  ({ className, style, ...props }, ref) => {
    return React.createElement(RNText, {
      ref,
      style: [resolveClassName(className), style],
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
  return React.createElement(RNScrollView, {
    ref,
    style: [resolveClassName(className), style],
    contentContainerStyle: [resolveClassName(contentContainerClassName), contentContainerStyle],
    ...props
  });
});
ScrollView.displayName = "CSS(ScrollView)";

export const Pressable = React.forwardRef<
  any,
  React.ComponentPropsWithoutRef<typeof RNPressable> & { className?: string }
>(({ className, style, ...props }, ref) => {
  return React.createElement(RNPressable, {
    ref,
    style: (state: any) => [
      resolveClassName(className),
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
  return React.createElement(RNTextInput, {
    ref,
    style: [resolveClassName(className), style],
    placeholderTextColor: "#666666",
    ...props
  });
});
TextInput.displayName = "CSS(TextInput)";

export const Link = ({ className, style, ...props }: React.ComponentPropsWithoutRef<typeof RouterLink> & { className?: string }) => {
  return React.createElement(RouterLink, {
    style: [resolveClassName(className), style] as any,
    ...props
  });
};
Link.displayName = "CSS(Link)";
