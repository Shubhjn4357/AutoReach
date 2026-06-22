import React from "react";
import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../services/theme";
import { hapticLight } from "../services/haptics";

interface PillButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const PillButton: React.FC<PillButtonProps> = ({
  label,
  selected,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => { hapticLight(); onPress(); }}
      style={[
        styles.pill,
        selected
          ? {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }
          : {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1.5,
              shadowColor: colors.clayShadowDark,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
              elevation: 3,
            },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: selected ? "#FFFFFF" : colors.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
