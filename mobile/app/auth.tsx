import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAppStore } from "../services/store";
import { useTheme } from "../services/theme";
import { Ionicons } from "@expo/vector-icons";
import { CustomAlert, AlertButton } from "../components/CustomAlert";
import { Button } from "../components/Button";
import { useAuth } from "../hook/useAuth";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle } = useTheme();

  const [inputApiUrl, setInputApiUrl] = useState(store.apiUrl);

  useEffect(() => {
    setInputApiUrl(store.apiUrl);
  }, [store.apiUrl]);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
  });

  const showCustomAlert = (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
    buttons?: AlertButton[],
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      buttons,
    });
  };

  const {
    loading,
    devUsername,
    setDevUsername,
    handleNativeGoogleLogin,
    handleBypassLogin,
  } = useAuth({
    showCustomAlert,
  });

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Glow effect background element */}
          <View
            style={[styles.glowBlob, { backgroundColor: colors.primary }]}
          />

          <View style={styles.headerContainer}>
            <Ionicons name="sparkles" size={48} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              AutoReach
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              CRM Workspace & Automation Client
            </Text>
          </View>

          {/* Glassmorphic Auth Card */}
          <View style={glassStyle}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Workspace Authentication
            </Text>

            {/* Server Endpoint URL Configuration */}
            {__DEV__ && (
              <View style={[styles.inputGroup, { marginBottom: 20 }]}>
                <Text
                  style={[styles.inputLabel, { color: colors.textSecondary }]}
                >
                  Server API Endpoint URL
                </Text>
                <TextInput
                  placeholder="e.g. http://192.168.1.50:3000"
                  placeholderTextColor={colors.textMuted}
                  value={inputApiUrl}
                  onChangeText={setInputApiUrl}
                  onBlur={() => store.setApiUrl(inputApiUrl)}
                  autoCapitalize="none"
                  style={glassInputStyle}
                />
              </View>
            )}

            {/* Google Credentials Sign In */}
            <View style={styles.googleContainer}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Google Credentials Sign-In
              </Text>

              <Button
                isLoading={loading}
                label={loading ? "Authenticating..." : "Sign In with Google"}
                onPress={handleNativeGoogleLogin}
                icon={loading ? undefined : "logo-google"}
                disabled={loading}
                style={{ backgroundColor: "#4285F4", width: "100%" }}
              />
            </View>

            {/* Separator & Developer Bypass (Dev only) */}
            {__DEV__ && (
              <>
                {/* Separator / Divider */}
                <View style={styles.separatorContainer}>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                  <Text style={[styles.separatorText, { color: colors.textMuted }]}>
                    OR BYPASS
                  </Text>
                  <View
                    style={[
                      styles.separatorLine,
                      { backgroundColor: colors.border },
                    ]}
                  />
                </View>

                {/* Developer Bypass Sign In */}
                <View style={styles.inputGroup}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    Developer Username / Email
                  </Text>
                  <TextInput
                    placeholder="e.g. shubham"
                    placeholderTextColor={colors.textMuted}
                    value={devUsername}
                    onChangeText={setDevUsername}
                    autoCapitalize="none"
                    style={glassInputStyle}
                  />
                </View>

                <Button
                  label={loading ? "Logging in..." : "Developer Login Bypass"}
                  onPress={handleBypassLogin}
                  disabled={loading}
                  variant="primary"
                  style={{ width: "100%", marginTop: 8 }}
                />
              </>
            )}
          </View>
        </ScrollView>
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={() =>
            setAlertConfig((prev) => ({ ...prev, visible: false }))
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    position: "relative",
  },
  glowBlob: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    top: 50,
    right: -50,
    opacity: 0.15,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  googleContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 10,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  actionButton: {
    borderRadius: 12,
    height: 48,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
