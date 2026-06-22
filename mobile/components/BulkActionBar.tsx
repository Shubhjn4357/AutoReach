import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../services/theme";
import { hapticLight } from "../services/haptics";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface BulkAction {
  label: string;
  icon: IconName;
  onPress: () => void;
  bgColor?: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  onSelectAllToggle?: () => void;
  isAllSelected?: boolean;
  actions: BulkAction[];
  style?: ViewStyle;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onSelectAllToggle,
  isAllSelected = false,
  actions,
  style,
}) => {
  const { colors, glassStyle } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <View
      style={[
        glassStyle,
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: colors.text }]}>
          {selectedCount} lead{selectedCount > 1 ? "s" : ""} selected
        </Text>
        {onSelectAllToggle && (
          <Pressable
            onPress={() => {
              hapticLight();
              onSelectAllToggle();
            }}
            style={styles.textBtn}
          >
            <Text
              style={[
                styles.textBtnLabel,
                {
                  color: colors.primary,
                },
              ]}
            >
              {isAllSelected ? "Deselect All" : "Select All"}
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.actionsRow}>
        {actions.map((act, index) => (
          <Pressable
            key={index}
            onPress={() => {
              hapticLight();
              act.onPress();
            }}
            style={[
              styles.actionBtn,
              {
                backgroundColor: act.bgColor ?? colors.primary,
              },
            ]}
          >
            <Ionicons name={act.icon} size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnText} numberOfLines={1}>
              {act.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
    zIndex: 999,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
  },
  textBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  textBtnLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
