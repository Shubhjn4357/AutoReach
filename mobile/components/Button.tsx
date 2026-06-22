import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../services/theme";
import { hapticLight } from "../services/haptics";

type BtnVariant = "primary" | "secondary" | "danger" | "success" | "ghost";
type BtnSize   = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
  style,
  icon,
  iconPosition = "left",
}) => {
  const { colors } = useTheme();

  const bgMap: Record<BtnVariant, string> = {
    primary:   colors.primary,
    secondary: "transparent",
    danger:    colors.danger,
    success:   colors.success,
    ghost:     "transparent",
  };

  const textColorMap: Record<BtnVariant, string> = {
    primary:   "#FFFFFF",
    secondary: colors.text,
    danger:    "#FFFFFF",
    success:   "#FFFFFF",
    ghost:     colors.primary,
  };

  const borderMap: Record<BtnVariant, string | undefined> = {
    primary:   undefined,
    secondary: colors.border,
    danger:    undefined,
    success:   undefined,
    ghost:     colors.primary,
  };

  const heightMap: Record<BtnSize, number> = { sm: 36, md: 44, lg: 52 };
  const fontMap: Record<BtnSize, number>   = { sm: 12, md: 14, lg: 15 };
  const radiusMap: Record<BtnSize, number> = { sm: 12, md: 14, lg: 18 };
  const iconSizeMap: Record<BtnSize, number> = { sm: 14, md: 16, lg: 18 };

  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      disabled={disabled}
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          height: heightMap[size],
          borderRadius: radiusMap[size],
          borderWidth: borderMap[variant] ? 1.5 : 0,
          borderColor: borderMap[variant] ?? "transparent",
          flex: fullWidth ? 1 : undefined,
          opacity: disabled ? 0.5 : 1,
          shadowColor: variant === "primary" ? colors.primary :
                       variant === "danger"  ? colors.danger  :
                       variant === "success" ? colors.success : "transparent",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: variant === "ghost" || variant === "secondary" ? 0 : 4,
          flexDirection: iconPosition === "right" ? "row-reverse" : "row",
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={iconSizeMap[size]}
          color={textColorMap[variant]}
          style={iconPosition === "right" ? { marginLeft: 6 } : { marginRight: 6 }}
        />
      )}
      <Text
        style={{
          color: textColorMap[variant],
          fontSize: fontMap[size],
          fontWeight: "700",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
});

