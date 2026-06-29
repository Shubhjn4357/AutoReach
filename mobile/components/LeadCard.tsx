import React from "react";
import { View, Text, Pressable, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Lead } from "../shared/types";
import { useTheme } from "../services/theme";
import { StatusBadge } from "./StatusBadge";

interface LeadCardProps {
  lead: Lead;
  isBulkMode?: boolean;
  isSelected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

export const LeadCard: React.FC<LeadCardProps> = React.memo(({
  lead,
  isBulkMode = false,
  isSelected = false,
  onPress,
  onLongPress,
  style,
}) => {
  const { colors } = useTheme();

  const statusColor =
    lead.status === "SENT"
      ? colors.success
      : colors.primary;

  const statusBg =
    lead.status === "SENT"
      ? colors.successSoft
      : colors.primarySoft;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.leadCard,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1.5,
          shadowColor: isSelected ? colors.primary : colors.clayShadowDark,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isSelected ? 0.3 : 0.15,
          shadowRadius: 14,
          elevation: isSelected ? 10 : 6,
        },
        style,
      ]}
    >
      {/* Colored left accent */}
      <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />
      <View style={styles.cardContent}>
        {isBulkMode && (
          <View style={styles.checkboxContainer}>
            <Ionicons
              name={isSelected ? "checkbox" : "square-outline"}
              size={24}
              color={isSelected ? colors.primary : colors.textMuted}
            />
          </View>
        )}
        <View style={[styles.contactAvatar, { backgroundColor: statusBg }]}>
          <Text style={{ color: statusColor, fontWeight: "800", fontSize: 16 }}>
            {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
          </Text>
        </View>
        <View style={styles.detailsContainer}>
          <Text
            numberOfLines={1}
            style={[styles.nameText, { color: colors.text }]}
          >
            {lead.name}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.infoText, { color: colors.textSecondary }]}
          >
            {lead.phone || lead.email || "No contact info"}
          </Text>
        </View>
        <View style={styles.badgeContainer}>
          <StatusBadge status={lead.status} />
        </View>
      </View>
    </Pressable>
  );
});

LeadCard.displayName = "LeadCard";

const styles = StyleSheet.create({
  leadCard: {
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
    borderRadius: 22,
    width: "100%",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  cardAccent: {
    width: 5,
    height: "65%",
    borderRadius: 3,
    marginLeft: 12,
  },
  cardContent: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    paddingLeft: 12,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  infoText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  badgeContainer: {
    alignItems: "flex-end",
    paddingHorizontal: 8,
  },
});
