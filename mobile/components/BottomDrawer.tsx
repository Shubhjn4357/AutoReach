import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Animated,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../services/theme";

interface BottomDrawerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxScrollHeight?: number;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  visible,
  onClose,
  title,
  children,
  maxScrollHeight = 420,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const panY      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 160 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80) {
          onClose();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill}>
          <Animated.View
            style={[styles.backdrop, { opacity: fadeAnim }]}
          />
        </Pressable>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          style={{ width: "100%" }}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                transform: [{ translateY: Animated.add(slideAnim, panY) }],
                backgroundColor: colors.surface,
                borderColor: colors.border,
                shadowColor: colors.clayShadowDark,
              },
            ]}
          >
            {/* Drag Handle */}
            <View
              {...panResponder.panHandlers}
              style={styles.handleArea}
            >
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View
              {...panResponder.panHandlers}
              style={[styles.header, { borderBottomColor: `${colors.border}50` }]}
            >
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={{ color: colors.textMuted, fontSize: 22, lineHeight: 26 }}>✕</Text>
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: maxScrollHeight }}
            >
              <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 20) }}>
                {children}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
    overflow: "hidden",
  },
  handleArea: {
    width: "100%",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
