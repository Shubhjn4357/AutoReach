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
  Modal,
  Image,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { useAppStore } from "../../services/store";
import { getLocalLeads } from "../../services/db";
import { useSync } from "../../hook/useSync";
import { useCustomAlert } from "../../hook/useCustomAlert";
import { removeSecureItem, saveSecureItem, getSecureItem } from "../../services/store";

import { CustomAlert } from "../../components/CustomAlert";
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
import { useThrottle } from "../../hook/useThrottle";

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
  const { colors, glassStyle, glassInputStyle } = useTheme();

  const [totalLeads, setTotalLeads] = useState(0);

  // Biometrics Lock Preference
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Local WhatsApp Gateway State (Polled from API)
  const [waLinked, setWaLinked] = useState(false);
  const [waStatus, setWaStatus] = useState<string>("DISCONNECTED");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [pushName, setPushName] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  // Controls lists from API
  const [pluginsList, setPluginsList] = useState<Array<{ id: string; name: string; description: string; status: string }>>([]);
  const [webhooksList, setWebhooksList] = useState<Array<{ id: string; url: string; events: string[]; active: boolean }>>([]);
  const [apiKeysList, setApiKeysList] = useState<Array<{ id: string; name: string; keyPrefix: string; apiKey?: string; usageCount: number }>>([]);

  // Expandable sections toggles
  const [pluginsExpanded, setPluginsExpanded] = useState(false);
  const [webhooksExpanded, setWebhooksExpanded] = useState(false);
  const [apiKeysExpanded, setApiKeysExpanded] = useState(false);

  // Add Webhook Form
  const [webhookModalVisible, setWebhookModalVisible] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);

  // Add API Key Form
  const [apiKeyModalVisible, setApiKeyModalVisible] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [keySaving, setKeySaving] = useState(false);

  // Custom Alert State Hook
  const { alertConfig, showCustomAlert, hideCustomAlert } = useCustomAlert();

  // Gemini state variables
  const [_geminiApiKey, setGeminiApiKey] = useState("");
  const [tempGeminiKey, setTempGeminiKey] = useState("");
  const [geminiConnected, setGeminiConnected] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiKeyVisible, setGeminiKeyVisible] = useState(false);

  const [inputApiUrl, setInputApiUrl] = useState(store.apiUrl);

  useEffect(() => {
    setInputApiUrl(store.apiUrl);
  }, [store.apiUrl]);



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

  // Poll status of WhatsApp node
  useEffect(() => {
    if (!store.token) return;

    let intervalId: ReturnType<typeof setInterval>;
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${store.apiUrl}/api/whatsapp/status`, {
          headers: {
            Authorization: `Bearer ${store.token}`,
          },
        });
        if (!res.ok) {
          console.warn("[Mobile Settings] fetchStatus failed with HTTP status:", res.status);
          return;
        }
        const json = await res.json();
        console.log("[Mobile Settings] Polled status:", json.data?.status, "from:", store.apiUrl);
        if (json.success && json.data) {
          setWaStatus(json.data.status);
          setPhoneNumber(json.data.phoneNumber);
          setPushName(json.data.pushName);

          if (json.data.status === "READY") {
            await saveSecureItem("whatsapp_linked_locally", "true");
            setWaLinked(true);
          } else {
            await saveSecureItem("whatsapp_linked_locally", "false");
            setWaLinked(false);
          }

          if (json.data.status === "QR_READY") {
            const qrRes = await fetch(`${store.apiUrl}/api/whatsapp/qr`, {
              headers: {
                Authorization: `Bearer ${store.token}`,
              },
            });
            if (qrRes.ok) {
              const qrJson = await qrRes.json();
              console.log("[Mobile Settings] Polled QR code success:", !!qrJson.data?.qrCode);
              if (qrJson.success && qrJson.data) {
                setQrCode(qrJson.data.qrCode);
              }
            } else {
              console.warn("[Mobile Settings] fetchQR failed with HTTP status:", qrRes.status);
            }
          } else {
            setQrCode(null);
          }
        }
      } catch (err) {
        console.warn("Failed to poll WhatsApp status on mobile settings:", err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 4000);
    return () => clearInterval(intervalId);
  }, [store.token]);

  // Fetch controls data (plugins, webhooks, api keys)
  const fetchControlsData = async () => {
    if (!store.token) return;
    try {
      // Fetch plugins
      const plRes = await fetch(`${store.apiUrl}/api/plugins`, {
        headers: { Authorization: `Bearer ${store.token}` },
      });
      if (plRes.ok) {
        const plList = await plRes.json();
        setPluginsList(plList);
      }

      // Fetch webhooks
      const whRes = await fetch(`${store.apiUrl}/api/webhooks`, {
        headers: { Authorization: `Bearer ${store.token}` },
      });
      if (whRes.ok) {
        const whList = await whRes.json();
        setWebhooksList(whList);
      }

      // Fetch api keys
      const akRes = await fetch(`${store.apiUrl}/api/auth/api-keys`, {
        headers: { Authorization: `Bearer ${store.token}` },
      });
      if (akRes.ok) {
        const akList = await akRes.json();
        setApiKeysList(akList);
      }
    } catch (err) {
      console.warn("Failed to fetch control lists:", err);
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
    // Load biometric lock status
    (async () => {
      const enabled = await getSecureItem("biometric_lock_enabled");
      setBiometricsEnabled(enabled === "true");
    })();

    if (store.token) {
      fetchControlsData();
    }
  }, [store.token]);

  // Node controls
  const connectNode = async () => {
    hapticMedium();
    setWaLoading(true);
    try {
      const res = await fetch(`${store.apiUrl}/api/whatsapp/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
      });
      const json = await res.json();
      if (!json.success) {
        showCustomAlert("Error", json.error || "Failed to start connecting", "error");
      } else {
        showCustomAlert("Success", "Node connection loop started.", "success");
      }
    } catch (err) {
      showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
    } finally {
      setWaLoading(false);
    }
  };
  const handleConnectNode = useThrottle(connectNode, 2000);

  const disconnectNode = async () => {
    hapticMedium();
    setWaLoading(true);
    try {
      const res = await fetch(`${store.apiUrl}/api/whatsapp/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setWaStatus("DISCONNECTED");
        setQrCode(null);
        showCustomAlert("Disconnected", "WhatsApp Node disconnected successfully", "info");
      }
    } catch (err) {
      showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
    } finally {
      setWaLoading(false);
    }
  };
  const handleDisconnectNode = useThrottle(disconnectNode, 2000);

  const logoutNode = async () => {
    hapticWarning();
    setWaLoading(true);
    try {
      const res = await fetch(`${store.apiUrl}/api/whatsapp/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        setWaStatus("DISCONNECTED");
        setQrCode(null);
        setPhoneNumber(null);
        setPushName(null);
        showCustomAlert("Logged Out", "WhatsApp session unlinked successfully", "success");
      }
    } catch (err) {
      showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
    } finally {
      setWaLoading(false);
    }
  };
  const handleLogoutNode = useThrottle(logoutNode, 2000);

  // Plugins toggle
  const handleTogglePlugin = async (id: string, currentStatus: string) => {
    hapticMedium();
    const endpoint = currentStatus === "enabled" ? "disable" : "enable";
    try {
      const res = await fetch(`${store.apiUrl}/api/plugins/${id}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${store.token}`,
        },
      });
      if (res.ok) {
        fetchControlsData();
      }
    } catch (err) {
      console.warn("Failed to toggle plugin", err);
    }
  };

  // Webhooks
  const handleToggleWebhook = async (id: string, active: boolean, url: string, events: string[]) => {
    hapticMedium();
    try {
      const res = await fetch(`${store.apiUrl}/api/sessions/default/webhooks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
        body: JSON.stringify({ active: !active, url, events }),
      });
      if (res.ok) {
        fetchControlsData();
      }
    } catch (err) {
      console.warn("Failed to toggle webhook", err);
    }
  };

  const handleAddWebhookSubmit = async () => {
    if (!newWebhookUrl.trim()) return;
    setWebhookSaving(true);
    try {
      const res = await fetch(`${store.apiUrl}/api/sessions/default/webhooks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
        body: JSON.stringify({
          url: newWebhookUrl.trim(),
          secret: newWebhookSecret.trim() || undefined,
          events: ["message.received", "message.sent", "session.status"],
        }),
      });
      if (res.ok) {
        setWebhookModalVisible(false);
        setNewWebhookUrl("");
        setNewWebhookSecret("");
        fetchControlsData();
        hapticSuccess();
        showCustomAlert("Success", "Webhook registered successfully", "success");
      }
    } catch (err) {
      showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
    } finally {
      setWebhookSaving(false);
    }
  };

  const handleDeleteWebhook = (id: string) => {
    hapticWarning();
    showCustomAlert("Delete Webhook", "Are you sure you want to delete this webhook integration?", "warning", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${store.apiUrl}/api/sessions/default/webhooks/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${store.token}` },
            });
            if (res.ok) {
              fetchControlsData();
              showCustomAlert("Success", "Webhook removed", "success");
            }
          } catch (err) {
            showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
          }
        }
      }
    ]);
  };

  // API Keys
  const addApiKeySubmit = async () => {
    if (!newKeyName.trim()) return;
    setKeySaving(true);
    try {
      const res = await fetch(`${store.apiUrl}/api/auth/api-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${store.token}`,
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          role: "admin",
        }),
      });
      if (res.ok) {
        const keyData = await res.json();
        setApiKeyModalVisible(false);
        setNewKeyName("");
        fetchControlsData();
        await Clipboard.setStringAsync(keyData.apiKey);
        hapticSuccess();
        showCustomAlert("API Key Generated", `The API key has been copied to your clipboard automatically. Keep this key secure:\n\n${keyData.apiKey}`, "success");
      }
    } catch (err) {
      showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
    } finally {
      setKeySaving(false);
    }
  };
  const handleAddApiKeySubmit = useThrottle(addApiKeySubmit, 2000);

  const handleRevokeApiKey = (id: string) => {
    hapticWarning();
    showCustomAlert("Revoke Credentials", "Are you sure you want to revoke this API credential key? It will immediately stop working.", "warning", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Revoke",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${store.apiUrl}/api/auth/api-keys/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${store.token}` },
            });
            if (res.ok) {
              fetchControlsData();
              showCustomAlert("Success", "Key credentials revoked", "success");
            }
          } catch (err) {
            showCustomAlert("Error", err instanceof Error ? err.message : String(err), "error");
          }
        }
      }
    ]);
  };

  // Biometrics Lock
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

  // Gemini Key
  const handleSaveGeminiKey = async () => {
    const key = tempGeminiKey.trim();
    if (!key) {
      showCustomAlert("Error", "Please enter your Gemini API key", "error");
      return;
    }
    setGeminiTesting(true);
    try {
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

  // Node status badging
  const renderStatusBadge = () => {
    switch (waStatus) {
      case "READY":
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successSoft, borderColor: colors.success + "30", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.success, textTransform: "uppercase" }}>Linked & Online</Text>
          </View>
        );
      case "INITIALIZING":
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.warningSoft, borderColor: colors.warning + "30", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <ActivityIndicator size="small" color={colors.warning} />
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.warning, textTransform: "uppercase" }}>Initializing</Text>
          </View>
        );
      case "QR_READY":
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primarySoft, borderColor: colors.primary + "30", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Ionicons name="qr-code-outline" size={12} color={colors.primary} />
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.primary, textTransform: "uppercase" }}>Scan QR</Text>
          </View>
        );
      default:
        return (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.textMuted + "20", borderColor: colors.textMuted + "40", borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Ionicons name="link-outline" size={12} color={colors.textSecondary} />
            <Text style={{ fontSize: 9, fontWeight: "bold", color: colors.textSecondary, textTransform: "uppercase" }}>Disconnected</Text>
          </View>
        );
    }
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
                Configure and control the AutoReach system and offline nodes.
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

              {__DEV__ && (
                <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 6, marginVertical: 8, borderBottomWidth: 0 }]}>
                  <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>
                    Server API Endpoint URL
                  </Text>
                  <TextInput
                    value={inputApiUrl}
                    onChangeText={setInputApiUrl}
                    onBlur={() => store.setApiUrl(inputApiUrl)}
                    placeholder="e.g. http://192.168.1.50:3000"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    style={[glassInputStyle, {fontSize: 12, paddingHorizontal: 12, borderRadius: 10 }]}
                  />
                </View>
              )}

              <Pressable
                onPress={() => {
                  showCustomAlert("Log Out", "Are you sure you want to log out of your console account?", "warning", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Log Out",
                      style: "destructive",
                      onPress: async () => {
                        await removeSecureItem("auth_token");
                        store.setToken(null);
                        store.setUser(null);
                      }
                    }
                  ]);
                }}
                style={({ pressed }) => [
                  styles.logoutBtn,
                  {
                    backgroundColor: colors.dangerSoft,
                    borderColor: colors.danger + "40",
                    borderWidth: 1,
                    opacity: pressed ? 0.8 : 1,
                    marginTop: 12,
                  }
                ]}
              >
                <Ionicons name="log-out-outline" size={14} color={colors.danger} />
                <Text style={{ fontSize: 12, color: colors.danger, fontWeight: "700", marginLeft: 6 }}>Log Out Account</Text>
              </Pressable>
            </View>

            {/* WhatsApp Node Manager Card */}
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
                    WhatsApp Node Manager
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    Session ID: default
                  </Text>
                </View>
                {renderStatusBadge()}
              </View>

              {waStatus === "READY" && phoneNumber && (
                <View style={{ backgroundColor: colors.bg, padding: 12, borderRadius: 10, marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>Linked Device Info</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>Phone: +{phoneNumber}</Text>
                  {pushName && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>Profile Name: {pushName}</Text>}
                </View>
              )}

              {waStatus === "QR_READY" && qrCode && (
                <View style={{ alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12, marginBottom: 12, alignSelf: "center" }}>
                  <Text style={{ fontSize: 10, color: "#333", fontWeight: "700", marginBottom: 8 }}>SCAN THIS QR CODE TO PAIR</Text>
                  <Image source={{ uri: qrCode }} style={{ width: 160, height: 160, resizeMode: "contain" }} />
                  <Text style={{ fontSize: 9, color: "#666", marginTop: 8, textAlign: "center" }}>Scan this via Linked Devices in WhatsApp Web Settings</Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10 }}>
                {waStatus === "DISCONNECTED" || waStatus === "FAILED" ? (
                  <Pressable
                    onPress={handleConnectNode}
                    disabled={waLoading}
                    style={[styles.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  >
                    <Text style={styles.saveBtnText}>{waLoading ? "Initiating..." : "Connect Node"}</Text>
                  </Pressable>
                ) : (
                  <>
                    <Pressable
                      onPress={handleDisconnectNode}
                      disabled={waLoading}
                      style={[styles.disconnectBtn, { flex: 1, borderColor: colors.warning + "40", alignItems: "center", justifyContent: "center" }]}
                    >
                      <Text style={{ fontSize: 11, color: colors.warning, fontWeight: "700" }}>Disconnect</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleLogoutNode}
                      disabled={waLoading}
                      style={[styles.disconnectBtn, { flex: 1, borderColor: colors.danger + "40", alignItems: "center", justifyContent: "center" }]}
                    >
                      <Text style={{ fontSize: 11, color: colors.danger, fontWeight: "700" }}>Logout Session</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* System Extension Plugins Card */}
            <View
              style={[
                glassStyle,
                styles.sectionCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Pressable
                onPress={() => setPluginsExpanded(!pluginsExpanded)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.geminiIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="extension-puzzle-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                      System Extension Plugins
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Manage Gemini AI auto-responders & sync extensions
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={pluginsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {pluginsExpanded && (
                <View style={{ marginTop: 14, gap: 10 }}>
                  {pluginsList.map((pl) => (
                    <View key={pl.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: "bold" }}>{pl.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>{pl.description}</Text>
                      </View>
                      <Switch
                        value={pl.status === "enabled"}
                        onValueChange={() => handleTogglePlugin(pl.id, pl.status)}
                      />
                    </View>
                  ))}
                  {pluginsList.length === 0 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center" }}>No plugins detected</Text>
                  )}
                </View>
              )}
            </View>

            {/* Webhook Integrations Card */}
            <View
              style={[
                glassStyle,
                styles.sectionCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Pressable
                onPress={() => setWebhooksExpanded(!webhooksExpanded)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.geminiIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="git-network-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                      Webhook Integrations
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Register outbound HTTP post dispatch hooks
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={webhooksExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {webhooksExpanded && (
                <View style={{ marginTop: 14, gap: 10 }}>
                  <Pressable
                    onPress={() => setWebhookModalVisible(true)}
                    style={[styles.saveBtn, { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + "40", height: 36, borderRadius: 8 }]}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>+ Add Webhook Integration</Text>
                  </Pressable>

                  {webhooksList.map((wh) => (
                    <View key={wh.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "bold" }} numberOfLines={1}>{wh.url}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 9, marginTop: 2 }}>Events: {JSON.stringify(wh.events)}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Switch
                          value={wh.active}
                          onValueChange={() => handleToggleWebhook(wh.id, wh.active, wh.url, wh.events)}
                        />
                        <Pressable onPress={() => handleDeleteWebhook(wh.id)} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {webhooksList.length === 0 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center" }}>No webhooks configured</Text>
                  )}
                </View>
              )}
            </View>

            {/* API Credentials Card */}
            <View
              style={[
                glassStyle,
                styles.sectionCard,
                { backgroundColor: colors.surface },
              ]}
            >
              <Pressable
                onPress={() => setApiKeysExpanded(!apiKeysExpanded)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.geminiIcon, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="key-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                      API Credentials Keys
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Generate Bearer keys to access web app
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={apiKeysExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>

              {apiKeysExpanded && (
                <View style={{ marginTop: 14, gap: 10 }}>
                  <Pressable
                    onPress={() => setApiKeyModalVisible(true)}
                    style={[styles.saveBtn, { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary + "40", height: 36, borderRadius: 8 }]}
                  >
                    <Text style={{ color: colors.primary, fontSize: 11, fontWeight: "700" }}>+ Generate New API Key</Text>
                  </Pressable>

                  {apiKeysList.map((ak) => (
                    <View key={ak.id} style={{ borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 11, fontWeight: "bold" }}>{ak.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 9, marginTop: 2 }}>Prefix: {ak.keyPrefix}****  |  Usage: {ak.usageCount}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Pressable
                          onPress={async () => {
                            await Clipboard.setStringAsync(ak.apiKey || ak.keyPrefix);
                            hapticSuccess();
                            showCustomAlert("Copied", "API Key copied to clipboard.", "success");
                          }}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="copy-outline" size={16} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleRevokeApiKey(ak.id)} style={{ padding: 4 }}>
                          <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {apiKeysList.length === 0 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center" }}>No API keys generated</Text>
                  )}
                </View>
              )}
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
                      onPress={() => setGeminiKeyVisible((v: boolean) => !v)}
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

        {/* Modal form for Webhook */}
        <Modal
          visible={webhookModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setWebhookModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.text }}>Add Webhook Integration</Text>
                <Pressable onPress={() => setWebhookModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                value={newWebhookUrl}
                onChangeText={setNewWebhookUrl}
                placeholder="https://yourdomain.com/webhook"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[glassInputStyle, { height: 44, marginBottom: 12 }]}
              />
              <TextInput
                value={newWebhookSecret}
                onChangeText={setNewWebhookSecret}
                placeholder="Webhook Secret (Optional)"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[glassInputStyle, { height: 44, marginBottom: 16 }]}
              />
              <Pressable
                onPress={handleAddWebhookSubmit}
                disabled={webhookSaving || !newWebhookUrl.trim()}
                style={[styles.saveBtn, { backgroundColor: colors.primary, height: 44 }]}
              >
                <Text style={styles.saveBtnText}>{webhookSaving ? "Saving..." : "Save Webhook"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Modal form for API Key */}
        <Modal
          visible={apiKeyModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setApiKeyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: colors.text }}>Generate API Key Credentials</Text>
                <Pressable onPress={() => setApiKeyModalVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                value={newKeyName}
                onChangeText={setNewKeyName}
                placeholder="Key Description (e.g. My Website)"
                placeholderTextColor={colors.textMuted}
                style={[glassInputStyle, { height: 44, marginBottom: 16 }]}
              />
              <Pressable
                onPress={handleAddApiKeySubmit}
                disabled={keySaving || !newKeyName.trim()}
                style={[styles.saveBtn, { backgroundColor: colors.primary, height: 44 }]}
              >
                <Text style={styles.saveBtnText}>{keySaving ? "Generating..." : "Generate Key"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          buttons={alertConfig.buttons}
          onClose={hideCustomAlert}
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
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    width: "100%",
  },
});
