import { useEffect, useState, Suspense } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { useAppStore } from "../../services/store";
import { getLocalLeads } from "../../services/db";
import { useSync } from "../../hook/useSync";
import { removeSecureItem, saveSecureItem, getSecureItem } from "../../services/store";

import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";

import * as LocalAuthentication from "expo-local-authentication";
import { APP_CONSTANTS } from "../../constant";
import {
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticError
} from "../../services/haptics";

export default function SettingsScreen() {
  const { colors } = useTheme();
  return (
    <Suspense fallback={
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    }>
      <SettingsScreenContent />
    </Suspense>
  );
}

function SettingsScreenContent() {
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle, clayStyle, clayInputStyle } = useTheme();

  const [totalLeads, setTotalLeads] = useState(0);

  // Biometrics Lock Preference
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Local WhatsApp Gateway State
  const [waLinked, setWaLinked] = useState(false);

  // Gemini AI / BYOK State
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [tempGeminiKey, setTempGeminiKey] = useState("");
  const [geminiKeyVisible, setGeminiKeyVisible] = useState(false);
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);

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
    syncing,
    handleSync,
    queueSize,
  } = useSync({
    showCustomAlert,
    refetchLeads: async () => {
      await loadStats();
    },
  });

  const loadStats = async () => {
    try {
      const leads = await getLocalLeads();
      setTotalLeads(leads.length);
    } catch (e) {
      console.warn("Stats read failed", e);
    }
  };

  useEffect(() => {
    loadStats();
    // Load saved Gemini key
    (async () => {
      const savedKey = await getSecureItem("gemini_api_key");
      if (savedKey) {
        setGeminiApiKey(savedKey);
        setTempGeminiKey(savedKey);
        setGeminiConnected(true);
      }
    })();
    // Load local WhatsApp linking status
    (async () => {
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      if (isLinked === "true") {
        setWaLinked(true);
      }
    })();
    // Load biometric lock status
    (async () => {
      const enabled = await getSecureItem("biometric_lock_enabled");
      setBiometricsEnabled(enabled === "true");
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      setWaLinked(isLinked === "true");
    })();
  }, [store.showWaWeb, store.waWebStep]);

  const startWaLinking = () => {
    hapticMedium();
    store.setWaWebVisible(true);
  };

  const handleUnlinkWa = async () => {
    hapticWarning();
    await saveSecureItem("whatsapp_linked_locally", "false");
    setWaLinked(false);
    showCustomAlert("Disconnected", "Local WhatsApp gateway has been unlinked.", "info");
  };

  const handleToggleBiometrics = async (value: boolean) => {
    hapticMedium();
    if (value) {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
          hapticError();
          showCustomAlert(
            "Unsupported",
            "This device does not support biometric authentication.",
            "error"
          );
          return;
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
          hapticWarning();
          showCustomAlert(
            "Not Enrolled",
            "Please register FaceID/TouchID in your device settings first.",
            "warning"
          );
          return;
        }

        // Test biometric authentication before enabling
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify biometrics to enable lock",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await saveSecureItem("biometric_lock_enabled", "true");
          setBiometricsEnabled(true);
          hapticSuccess();
          showCustomAlert(
            "Enabled",
            "Biometric lock has been enabled. The app will lock when closed or sent to the background.",
            "success"
          );
        }
      } catch (err) {
        console.warn("Enable biometrics failed", err);
      }
    } else {
      // Prompt user to verify biometrics once to turn it off
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Verify biometrics to disable lock",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await saveSecureItem("biometric_lock_enabled", "false");
          setBiometricsEnabled(false);
          hapticSuccess();
          showCustomAlert(
            "Disabled",
            "Biometric lock has been disabled.",
            "info"
          );
        }
      } catch (err) {
        console.warn("Disable biometrics failed", err);
      }
    }
  };

  const handleSaveGeminiKey = async () => {
    const key = tempGeminiKey.trim();
    if (!key) {
      showCustomAlert("Error", "Please enter your Gemini API key", "error");
      return;
    }
    setGeminiTesting(true);
    try {
      // Quick validation ping to Gemini
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      );
      if (res.ok) {
        await saveSecureItem("gemini_api_key", key);
        setGeminiApiKey(key);
        setGeminiConnected(true);
        hapticSuccess();
        showCustomAlert("Connected!", "Gemini AI is now active. Your API key is stored securely.", "success");
      } else {
        hapticError();
        showCustomAlert("Invalid Key", "Could not validate the API key. Please check and try again.", "error");
      }
    } catch {
      hapticWarning();
      showCustomAlert("Network Error", "Could not reach Google API. Check your internet connection.", "warning");
    } finally {
      setGeminiTesting(false);
    }
  };

  const handleDisconnectGemini = async () => {
    showCustomAlert(
      "Disconnect Gemini",
      "Remove your Gemini API key from this device?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await saveSecureItem("gemini_api_key", "");
            setGeminiApiKey("");
            setTempGeminiKey("");
            setGeminiConnected(false);
            showCustomAlert("Disconnected", "Gemini API key removed.", "info");
          },
        },
      ],
    );
  };



  const handleWipeData = async () => {
    hapticHeavy();
    showCustomAlert(
      "Confirm Wipe",
      "Are you absolutely sure you want to clear all offline caches and databases from this device?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Everything",
          style: "destructive",
          onPress: async () => {
            try {
              await removeSecureItem("auth_token");
              store.setToken(null);
              store.setUser(null);
              showCustomAlert(
                "Success",
                "Local database cache purged. Please restart the app.",
                "success",
              );
            } catch (err) {
              console.error(err);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: colors.text }]}>{APP_CONSTANTS.settings.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {APP_CONSTANTS.settings.subtitle}
            </Text>
          </View>

          {/* User Account Info */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Workspace Account
            </Text>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                Email Address
              </Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {store.user?.email || "offline_dev@autoreach.com"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                Role Privilege
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  styles.primaryRole,
                  { color: colors.primary },
                ]}
              >
                {store.user?.role || "ADMIN (Local Dev)"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                Organization ID
              </Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {store.user?.organizationId || "org_mock_123"}
              </Text>
            </View>
          </View>

          {/* Security & Authentication */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.geminiIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="finger-print-outline" size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Biometric Lock
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                    Require FaceID / TouchID to open app
                  </Text>
                </View>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
              />
            </View>
          </View>

          {/* Local WhatsApp Gateway Configuration */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
                <View style={[
                  styles.geminiIcon,
                  { backgroundColor: waLinked ? colors.successSoft : colors.primarySoft }
                ]}>
                  <Ionicons name="logo-whatsapp" size={16} color={waLinked ? colors.success : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                    Local WhatsApp Gateway
                  </Text>
                  <Text style={[styles.rowLabel, {
                    color: waLinked ? colors.success : colors.textMuted,
                    fontWeight: "600",
                    marginTop: 1,
                  }]}>
                    {waLinked ? "● Linked & Online" : "○ Disconnected"}
                  </Text>
                </View>
                {waLinked && (
                  <Pressable
                    onPress={handleUnlinkWa}
                    style={[styles.disconnectBtn, { borderColor: colors.danger + "60" }]}
                  >
                    <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "700" }}>Unlink</Text>
                  </Pressable>
                )}
              </View>

              <Text style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 14 }}>
                Link your local device to scan and automatically dispatch messages in the background without WhatsApp's official API.
              </Text>

              {!waLinked && (
              <Pressable
                  onPress={startWaLinking}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, width: "100%", height: 42, borderRadius: 10, flexDirection: "row" }]}
              >
                  <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveBtnText}>Link Local Device (QR Code)</Text>
              </Pressable>
              )}
          </View>

          {/* Gemini AI Integration */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 8 }}>
              <View style={[
                styles.geminiIcon,
                { backgroundColor: geminiConnected ? colors.successSoft : colors.primarySoft }
              ]}>
                <Text style={{ fontSize: 16 }}>✦</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Gemini AI
                </Text>
                <Text style={[styles.rowLabel, {
                  color: geminiConnected ? colors.success : colors.textMuted,
                  fontWeight: "600",
                  marginTop: 1,
                }]}>
                  {geminiConnected ? "● Connected" : "○ Not connected"}
                </Text>
              </View>
              {geminiConnected && (
                <Pressable
                  onPress={handleDisconnectGemini}
                  style={[styles.disconnectBtn, { borderColor: colors.danger + "60" }]}
                >
                  <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "700" }}>Disconnect</Text>
                </Pressable>
              )}
            </View>

            {geminiConnected ? (
              <View style={[
                styles.connectedBanner,
                { backgroundColor: colors.successSoft, borderColor: colors.success + "40" }
              ]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: "600", marginLeft: 8 }}>
                  AI features are active
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 6 }]}>
                  Bring Your Own Key (BYOK)
                </Text>
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <TextInput
                    value={tempGeminiKey}
                    onChangeText={setTempGeminiKey}
                    placeholder="AIza..."
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!geminiKeyVisible}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[glassInputStyle, { flex: 1, height: 44 }]}
                  />
                  <Pressable
                    onPress={() => setGeminiKeyVisible((v) => !v)}
                    style={[styles.eyeBtn, { backgroundColor: colors.primarySoft }]}
                  >
                    <Ionicons
                      name={geminiKeyVisible ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.primary}
                    />
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={handleSaveGeminiKey}
                    disabled={geminiTesting}
                    style={[
                      styles.saveBtn,
                      { backgroundColor: geminiTesting ? colors.textMuted : colors.primary, flex: 1 },
                    ]}
                  >
                    <Text style={styles.saveBtnText}>
                      {geminiTesting ? "Validating..." : "Connect"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL("https://aistudio.google.com/app/apikey")}
                    style={[
                      styles.getKeyBtn,
                      { borderColor: colors.primary + "60", backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <Ionicons name="open-outline" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "700" }}>Get Key</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>

          {/* Database Cache Stats */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Local Cache Diagnostics
            </Text>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                Total Leads Cached
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.primary, fontSize: 14 },
                ]}
              >
                {totalLeads}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                Queued Sync Operations
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: colors.warning, fontSize: 14 },
                ]}
              >
                {queueSize}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={handleSync}
                disabled={syncing}
                style={[
                  styles.syncBtn,
                  {
                    backgroundColor: `${colors.primary}1A`,
                    borderColor: `${colors.primary}4D`,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                  {syncing ? "Synchronizing..." : "Trigger Manual Sync"}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleWipeData}
                style={[
                  styles.purgeBtn,
                  {
                    backgroundColor: `${colors.danger}1A`,
                    borderColor: `${colors.danger}4D`,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text style={[styles.purgeBtnText, { color: colors.danger }]}>
                  Purge Database Cache
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footerContainer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              {APP_CONSTANTS.settings.versionBanner}
            </Text>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryRole: {
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  saveBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  geminiIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  disconnectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  connectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  getKeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  syncBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  syncBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  purgeBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  purgeBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  footerContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 24,
  },
  modalCard: {
    padding: 24,
    borderRadius: 20,
    width: "100%",
  },
  closeBtn: {
    padding: 4,
  },
});
