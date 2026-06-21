import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../services/store";
import { useTheme } from "../services/theme";
import { Ionicons } from "@expo/vector-icons";
import { useThrottle } from "../hook/useThrottle";
import { CustomAlert, AlertButton } from "../components/CustomAlert";
import { Host } from "@expo/ui";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

try {
  GoogleSignin.configure({
    webClientId: "625470834164-devclientid.apps.googleusercontent.com", // Replace with your Google OAuth client ID
    offlineAccess: true,
  });
} catch (e) {
  console.warn("GoogleSignin configure failed", e);
}

export default function AuthScreen() {
  const router = useRouter();
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle } = useTheme();

  const [devUsername, setDevUsername] = useState("shubham");
  const [loading, setLoading] = useState(false);
  const token = store.token;

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

  const handleGoogleLogin = async (idToken: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${store.apiUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error?.message || "Google Authentication failed",
        );
      }

      const { token: authToken, user } = result.data;
      await store.setToken(authToken);
      store.setUser(user);

      showCustomAlert(
        "Google Sign-In Success",
        `Welcome back, ${user.name}!`,
        "success",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showCustomAlert("Google Authentication Failed", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNativeGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error("No ID Token returned from Google Sign-In");
      }
      await handleGoogleLogin(idToken);
    } catch (error: any) {
      console.warn("Google native login error", error);
      showCustomAlert(
        "Native Google Sign-In Failed",
        error.message || "Failed to authenticate",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBypassLogin = async () => {
    if (!devUsername.trim()) {
      showCustomAlert(
        "Validation Error",
        "Please enter a bypass username.",
        "warning",
      );
      return;
    }

    setLoading(true);
    try {
      const mockToken = `mock_${devUsername.trim().toLowerCase()}`;

      // Try connecting to the Next.js backend server
      try {
        const response = await fetch(`${store.apiUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: mockToken }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const { token: authToken, user } = result.data;
          await store.setToken(authToken);
          store.setUser(user);
          showCustomAlert(
            "Bypass Success",
            `Logged in as ${user.name} (Developer Mode)`,
            "success",
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
          );
          return;
        }
      } catch (netError) {
        console.warn(
          "Backend API unreachable, using client-side offline bypass:",
          netError,
        );
      }

      // Offline Fallback Mode
      const offlineUser = {
        id: `u_mock_${devUsername.trim().toLowerCase()}`,
        email: `${devUsername.trim().toLowerCase()}@example.com`,
        name: devUsername.trim().toUpperCase(),
        role: "ADMIN",
        organizationId: "org_mock_123",
      };
      await store.setToken(mockToken);
      store.setUser(offlineUser);
      showCustomAlert(
        "Bypass Success (Offline Fallback)",
        `Logged in locally as ${offlineUser.name}`,
        "success",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showCustomAlert("Bypass Authentication Failed", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const throttledBypassLogin = useThrottle(handleBypassLogin, 2000);

  return (
    <Host style={{ flex: 1 }}>
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

            {/* Google Credentials Sign In */}
            <View style={styles.googleContainer}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                Google Credentials Sign-In
              </Text>

              <Pressable
                onPress={handleNativeGoogleLogin}
                style={[
                  styles.actionButton,
                  { backgroundColor: "#4285F4", flexDirection: "row", gap: 8 },
                ]}
              >
                <Ionicons name="logo-google" size={16} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Sign In with Google</Text>
              </Pressable>
            </View>

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

            <Pressable
              onPress={throttledBypassLogin}
              disabled={loading}
              style={({ pressed }: { pressed: boolean }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed || loading ? 0.8 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>
                  Developer Login Bypass
                </Text>
              )}
            </Pressable>
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
    </Host>
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
