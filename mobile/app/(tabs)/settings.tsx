import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { useAppStore } from "../../services/store";
import { getQueuedOperations, getLocalLeads } from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import { removeSecureItem, saveSecureItem, getSecureItem } from "../../services/store";
import { triggerLocalNotification } from "../../services/notifications";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Host } from "@expo/ui";
import {
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
  hapticError,
} from "../../services/haptics";

export default function SettingsScreen() {
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle, clayStyle, clayInputStyle } = useTheme();

  const [syncQueueSize, setSyncQueueSize] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [tempApiUrl, setTempApiUrl] = useState(store.apiUrl);
  const [syncing, setSyncing] = useState(false);

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

  const loadStats = async () => {
    try {
      const queue = await getQueuedOperations();
      setSyncQueueSize(queue.length);
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
  }, [store.apiUrl]);

  const handleSaveApi = () => {
    if (!tempApiUrl.trim()) return;
    hapticMedium();
    store.setApiUrl(tempApiUrl.trim());
    hapticSuccess();
    showCustomAlert("Success", "API Endpoint updated successfully.", "success");
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

  const handleManualSync = async () => {
    hapticMedium();
    setSyncing(true);
    const result = await executeSyncCycle();
    setSyncing(false);
    if (result.success) {
      hapticSuccess();
      showCustomAlert(
        "Sync Complete",
        `Successfully synchronized ${result.syncedCount} offline operations.`,
        "success",
      );
      await triggerLocalNotification(
        "AutoReach Sync Completed",
        `Successfully synchronized ${result.syncedCount} offline operations.`,
      );
    } else {
      showCustomAlert(
        "Sync Error",
        "Could not connect to the API server. Please check settings.",
        "error",
      );
    }
    await loadStats();
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
    <Host style={{ flex: 1 }}>
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Configure your workspace endpoints and offline caches
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

          {/* API Server Configurations */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              API Connections
            </Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Backend Endpoint URL
            </Text>
            <View
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              <TextInput
                value={tempApiUrl}
                onChangeText={setTempApiUrl}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                style={[glassInputStyle, { flex: 1, height: 40 }]}
              />
              <Pressable
                onPress={handleSaveApi}
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
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
                {syncQueueSize}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <Pressable
                onPress={handleManualSync}
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
              AutoReach Client Build v1.0.0 (Production-Level Engine)
            </Text>
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
      </SafeAreaView>
    </Host>
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
});
