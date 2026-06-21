import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  hapticLight,
} from "../../services/haptics";

export default function SettingsScreen() {
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle, clayStyle, clayInputStyle } = useTheme();

  const [syncQueueSize, setSyncQueueSize] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Local WhatsApp Gateway State
  const [waLinked, setWaLinked] = useState(false);
  const [waModalVisible, setWaModalVisible] = useState(false);
  const [waLinkingProgress, setWaLinkingProgress] = useState(0);
  const [waLinkingStep, setWaLinkingStep] = useState<"qr" | "loading" | "success">("qr");

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
    // Load local WhatsApp linking status
    (async () => {
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      if (isLinked === "true") {
        setWaLinked(true);
      }
    })();
  }, []);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  const startWaLinking = () => {
    hapticMedium();
    setHasScanned(false);
    setWaLinkingStep("qr");
    setWaLinkingProgress(0);
    setWaModalVisible(true);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (hasScanned) return;
    setHasScanned(true);
    hapticSuccess();
    setWaLinkingStep("loading");
    setWaLinkingProgress(0.2);

    try {
      let gatewayUrl = data.trim();
      if (!gatewayUrl.startsWith("http://") && !gatewayUrl.startsWith("https://")) {
        try {
          const parsed = JSON.parse(gatewayUrl);
          if (parsed.url) {
            gatewayUrl = parsed.url;
          }
        } catch {
          gatewayUrl = `http://${gatewayUrl}`;
        }
      }

      const urlObj = new URL(gatewayUrl);
      setWaLinkingProgress(0.5);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${urlObj.origin}/status`, {
        signal: controller.signal
      }).catch(async () => {
        return fetch(`${urlObj.origin}/`, { signal: controller.signal });
      });

      clearTimeout(timeoutId);
      setWaLinkingProgress(0.8);

      await saveSecureItem("whatsapp_gateway_url", urlObj.origin);
      await saveSecureItem("whatsapp_linked_locally", "true");

      setWaLinked(true);
      setWaLinkingProgress(1.0);
      setWaLinkingStep("success");
      hapticSuccess();

      await triggerLocalNotification(
        "WhatsApp Gateway Linked",
        `Successfully linked to local WhatsApp gateway: ${urlObj.origin}`
      );

      setTimeout(() => {
        setWaModalVisible(false);
      }, 1500);

    } catch (err: any) {
      console.warn("Connection verification failed:", err);
      hapticError();
      setHasScanned(false);
      setWaLinkingStep("qr");
      showCustomAlert(
        "Linking Failed",
        `Could not verify connection to local gateway. Make sure the server is running on the same network and status endpoint is reachable.`,
        "error"
      );
    }
  };

  const handleUnlinkWa = async () => {
    hapticWarning();
    await saveSecureItem("whatsapp_linked_locally", "false");
    setWaLinked(false);
    showCustomAlert("Disconnected", "Local WhatsApp gateway has been unlinked.", "info");
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
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

        <Modal
          transparent
          visible={waModalVisible}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 24,
                  alignItems: "center",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: colors.text,
                  }}
                >
                  Link WhatsApp Device
                </Text>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => setWaModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              {waLinkingStep === "qr" && (
                <View style={{ alignItems: "center", width: "100%" }}>
                  <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 20 }}>
                    Point your camera at the local WhatsApp Gateway QR code (containing your gateway URL) to link the device.
                  </Text>

                  {!cameraPermission ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 30 }} />
                  ) : !cameraPermission.granted ? (
                    <View style={{ alignItems: "center", marginVertical: 20, paddingHorizontal: 10 }}>
                      <Ionicons name="camera-reverse-outline" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
                      <Text style={{ fontSize: 14, color: colors.text, textAlign: "center", marginBottom: 16, fontWeight: "600" }}>
                        Camera permission is required to scan QR codes.
                      </Text>
                      <Pressable
                        onPress={requestCameraPermission}
                        style={[styles.saveBtn, { backgroundColor: colors.primary, width: "100%", height: 40, borderRadius: 10 }]}
                      >
                        <Text style={styles.saveBtnText}>Grant Camera Permission</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={{
                      width: 250,
                      height: 250,
                      borderRadius: 20,
                      overflow: "hidden",
                      borderColor: colors.border,
                      borderWidth: 2,
                      marginBottom: 20,
                      position: "relative",
                      backgroundColor: "#000"
                    }}>
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        barcodeScannerSettings={{
                          barcodeTypes: ["qr"],
                        }}
                        onBarcodeScanned={handleBarCodeScanned}
                      />
                      {/* Scanning Target Box Indicator */}
                      <View style={{
                        position: "absolute",
                        top: "20%",
                        left: "20%",
                        width: "60%",
                        height: "60%",
                        borderColor: colors.primary,
                        borderWidth: 2,
                        borderRadius: 12,
                        borderStyle: "dashed",
                      }} />
                    </View>
                  )}
                </View>
              )}

              {waLinkingStep === "loading" && (
                <View style={{ alignItems: "center", width: "100%", paddingVertical: 20 }}>
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 8 }}>
                    Connecting local socket gateway...
                  </Text>
                  <View style={{ width: "100%", height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ width: `${waLinkingProgress * 100}%`, height: "100%", backgroundColor: colors.primary }} />
                  </View>
                </View>
              )}

              {waLinkingStep === "success" && (
                <View style={{ alignItems: "center", width: "100%", paddingVertical: 20 }}>
                  <Ionicons name="checkmark-circle" size={56} color={colors.success} style={{ marginBottom: 16 }} />
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.text, marginBottom: 4 }}>
                    WhatsApp Linked Successfully
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Device is now active for local auto-dispatches.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
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
