import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  DimensionValue,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useTheme } from "../services/theme";

export function SkeletonPulse({
  width = "100%",
  height = 20,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return { opacity: opacity.value };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { backgroundColor: colors.border, width, height },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function LeadCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.row}>
        <SkeletonPulse width="60%" height={18} style={styles.mb8} />
        <SkeletonPulse width="25%" height={18} style={styles.mb8} />
      </View>
      <SkeletonPulse
        width="30%"
        height={24}
        style={[styles.mb12, { borderRadius: 6 }]}
      />
      <View
        style={[
          styles.box,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <SkeletonPulse width="50%" height={12} style={styles.mb8} />
        <SkeletonPulse width="90%" height={12} />
      </View>
    </View>
  );
}

export function ContactDetailSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, padding: 16, gap: 16 }}>
      {/* Profile Card Skeleton */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.row, { justifyContent: "flex-start", gap: 12, marginBottom: 16 }]}>
          <SkeletonPulse width={48} height={48} style={{ borderRadius: 24 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonPulse width="55%" height={18} />
            <SkeletonPulse width="35%" height={12} />
          </View>
          <SkeletonPulse width={60} height={20} style={{ borderRadius: 10 }} />
        </View>
        <View style={[styles.box, { backgroundColor: colors.bg, borderColor: colors.border, gap: 12, paddingVertical: 14 }]}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <SkeletonPulse width="15%" height={12} />
            <SkeletonPulse width="50%" height={12} />
          </View>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <SkeletonPulse width="15%" height={12} />
            <SkeletonPulse width="50%" height={12} />
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 6 }}>
            <SkeletonPulse width="25%" height={10} style={{ marginBottom: 4 }} />
            <SkeletonPulse width="75%" height={14} />
          </View>
        </View>
      </View>

      {/* AI CRM Auditor Skeleton */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
            <SkeletonPulse width={20} height={20} style={{ borderRadius: 10 }} />
            <SkeletonPulse width="40%" height={16} />
          </View>
          <SkeletonPulse width={80} height={32} style={{ borderRadius: 8 }} />
        </View>
        <SkeletonPulse width="100%" height={40} style={{ borderRadius: 10 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 8,
  },
  card: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  box: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
});
