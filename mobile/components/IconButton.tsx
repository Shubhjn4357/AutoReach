import React from "react";
import { Pressable, Text, View, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../services/theme";
import { hapticLight } from "../services/haptics";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  color?: string;
  bgColor?: string;
  size?: number;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  color,
  bgColor,
  size = 18,
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.btn,
        {
          backgroundColor: bgColor ?? colors.primarySoft,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={size}
        color={color ?? colors.primary}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
