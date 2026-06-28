import { useState } from "react";
import { useRouter } from "expo-router";
import { useAppStore } from "../services/store";
import { useThrottle } from "./useThrottle";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AlertButton } from "../components/CustomAlert";

try {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    offlineAccess: true,
  });
} catch (e) {
  console.warn("GoogleSignin configure failed", e);
}

interface UseAuthOptions {
  showCustomAlert: (
    title: string,
    message: string,
    type: "info" | "success" | "warning" | "error",
    buttons?: AlertButton[]
  ) => void;
}

export function useAuth({ showCustomAlert }: UseAuthOptions) {
  const router = useRouter();
  const store = useAppStore();
  const [loading, setLoading] = useState(false);
  const [devUsername, setDevUsername] = useState("shubham");

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
          result.error?.message || "Google Authentication failed"
        );
      }

      const { token: authToken, user } = result.data;
      await store.setToken(authToken);
      store.setUser(user);

      showCustomAlert(
        "Google Sign-In Success",
        `Welcome back, ${user.name}!`,
        "success",
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
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
    } catch (error: unknown) {
      console.warn("Google native login error", error);
      showCustomAlert(
        "Native Google Sign-In Failed",
        error instanceof Error ? error.message : "Failed to authenticate",
        "error"
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
        "warning"
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
            [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
          );
          return;
        }
      } catch (netError) {
        console.warn(
          "Backend API unreachable, using client-side offline bypass:",
          netError
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
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showCustomAlert("Bypass Authentication Failed", message, "error");
    } finally {
      setLoading(false);
    }
  };

  const throttledBypassLogin = useThrottle(handleBypassLogin, 2000);

  return {
    loading,
    devUsername,
    setDevUsername,
    handleNativeGoogleLogin,
    handleBypassLogin: throttledBypassLogin,
  };
}
