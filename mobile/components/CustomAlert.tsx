import React from "react";
import { Modal, StyleSheet, View, Text, Pressable } from "react-native";
import { useTheme } from "../services/theme";
import { Ionicons } from "@expo/vector-icons";
import { Host } from "@expo/ui";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  onClose: () => void;
  type?: "info" | "warning" | "success" | "error";
}

export function CustomAlert({
  visible,
  title,
  message,
  buttons,
  onClose,
  type = "info",
}: CustomAlertProps) {
  const { theme, colors, glassStyle } = useTheme();

  if (!visible) return null;

  let iconName: keyof typeof Ionicons.glyphMap = "information-circle-outline";
  let iconColor = colors.primary;
  if (type === "warning") {
    iconName = "warning-outline";
    iconColor = colors.warning;
  } else if (type === "success") {
    iconName = "checkmark-circle-outline";
    iconColor = colors.success;
  } else if (type === "error") {
    iconName = "alert-circle-outline";
    iconColor = colors.danger;
  }

  const alertButtons = buttons || [{ text: "OK", onPress: onClose }];

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <Host style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View
            style={[
              glassStyle,
              styles.card,
              { backgroundColor: colors.surface },
            ]}
          >
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={40} color={iconColor} />
            </View>

            {/* Title & Message */}
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>

            {/* Action Buttons Row */}
            <View style={styles.buttonsContainer}>
              {alertButtons.map((btn, index) => {
                const isCancel = btn.style === "cancel";
                const isDestructive = btn.style === "destructive";

                let btnBg = colors.primary;
                let textColor = theme === "dark" ? colors.text : colors.bg;

                if (isCancel) {
                  btnBg = "transparent";
                  textColor = colors.textSecondary;
                } else if (isDestructive) {
                  btnBg = colors.danger;
                }

                const handlePress = () => {
                  onClose();
                  if (btn.onPress) btn.onPress();
                };

                return (
                  <Pressable
                    key={index}
                    onPress={handlePress}
                    style={[
                      styles.button,
                      { backgroundColor: btnBg },
                      isCancel && {
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        { color: textColor },
                        isCancel && { fontWeight: "500" },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Host>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderRadius: 20,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
