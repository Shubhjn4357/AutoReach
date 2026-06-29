import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LeadStatus } from "../shared/types";
import { useTheme } from "../services/theme";

interface StatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = "md",
  style,
}) => {
  const { colors } = useTheme();

  const statusColor =
    status === "SENT"
      ? colors.success
      : colors.primary;

  const statusBg =
    status === "SENT"
      ? colors.successSoft
      : colors.primarySoft;

  const isSm = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusBg,
          paddingHorizontal: isSm ? 6 : 8,
          height: isSm ? 18 : 22,
          borderRadius: isSm ? 9 : 11,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusColor,
            fontSize: isSm ? 8 : 9,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
