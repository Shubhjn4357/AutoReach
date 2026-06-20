import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppStore } from "../services/store";
import { useTheme } from "../services/theme";
import { Ionicons } from "@expo/vector-icons";

export default function AuthScreen() {
  const router = useRouter();
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle } = useTheme();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim() };

      const response = await fetch(`${store.apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || "Authentication failed");
      }

      const { token, user } = result.data;
      await store.setToken(token);
      store.setUser(user);

      Alert.alert(isLogin ? "Welcome Back!" : "Account Created!", `Logged in as ${user.name}`);
      router.replace("/(tabs)");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      Alert.alert("Authentication Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Glow effect background element */}
        <View style={[styles.glowBlob, { backgroundColor: colors.primary }]} />

        <View style={styles.headerContainer}>
          <Ionicons name="sparkles" size={48} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>AutoReach</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            CRM Workspace & Automation Client
          </Text>
        </View>

        {/* Glassmorphic Auth Card */}
        <View style={glassStyle}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {isLogin ? "Login to Workspace" : "Create Account"}
          </Text>

          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <TextInput
                placeholder="John Doe"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                style={glassInputStyle}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
            <TextInput
              placeholder="you@domain.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={glassInputStyle}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={glassInputStyle}
            />
          </View>

          <Pressable
            onPress={handleAuth}
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
                {isLogin ? "Sign In" : "Register Workspace"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => setIsLogin(!isLogin)} style={styles.toggleButton}>
            <Text style={[styles.toggleButtonText, { color: colors.primary }]}>
              {isLogin
                ? "Don't have an account? Sign Up"
                : "Already have an account? Sign In"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  toggleButton: {
    marginTop: 16,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
