import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { useTheme } from "../services/theme";

interface SectionLabelProps {
  label: string;
  style?: TextStyle;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ label, style }) => {
  const { colors } = useTheme();

  return (
    <Text
      style={[
        styles.text,
        {
          color: colors.textSecondary,
        },
        style,
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});
