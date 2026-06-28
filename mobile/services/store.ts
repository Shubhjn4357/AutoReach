import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

export interface AppState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
  } | null;
  apiUrl: string;
  theme: "dark" | "light";
  showWaWeb: boolean;
  waWebStep: "qr" | "loading" | "success";
}

// Initial in-memory state
let state: AppState = {
  token: null,
  user: null,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  theme: "dark",
  showWaWeb: false,
  waWebStep: "qr",
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}
import { Platform } from "react-native";

const fallbackStorage = new Map<string, string>();

export async function saveSecureItem(key: string, value: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    } else {
      fallbackStorage.set(key, value);
    }
    return;
  }
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch {
    // Ignore and fallback
  }
  fallbackStorage.set(key, value);
}

export async function removeSecureItem(key: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    } else {
      fallbackStorage.delete(key);
    }
    return;
  }
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
  } catch {
    // Ignore and fallback
  }
  fallbackStorage.delete(key);
}

export async function getSecureItem(key: string) {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(key);
    } else {
      return fallbackStorage.get(key) || null;
    }
  }
  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (isAvailable) {
      return await SecureStore.getItemAsync(key);
    }
  } catch {
    // Ignore and fallback
  }
  return fallbackStorage.get(key) || null;
}

export const useAppStore = () => {
  const [current, setCurrent] = useState<AppState>(state);

  useEffect(() => {
    const listener = () => setCurrent(state);
    listeners.add(listener);
    // Sync current React state with latest in-memory state
    setCurrent(state);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...current,
    setToken: async (token: string | null) => {
      try {
        if (token) {
          await saveSecureItem("auth_token", token);
        } else {
          await removeSecureItem("auth_token");
        }
        state = { ...state, token };
        notify();
      } catch (err) {
        console.error("SecureStore write error:", err);
      }
    },
    setUser: async (user: AppState["user"]) => {
      try {
        if (user) {
          await saveSecureItem("auth_user", JSON.stringify(user));
          if (user.name) {
            await saveSecureItem("profile_name", user.name);
          }
        } else {
          await removeSecureItem("auth_user");
          await removeSecureItem("profile_name");
        }
        state = { ...state, user };
        notify();
      } catch (err) {
        console.error("SecureStore write error for user:", err);
      }
    },
    setApiUrl: async (apiUrl: string) => {
      try {
        if (apiUrl) {
          await saveSecureItem("api_url", apiUrl);
        } else {
          await removeSecureItem("api_url");
        }
        state = { ...state, apiUrl };
        notify();
      } catch (err) {
        console.error("SecureStore write error for api_url:", err);
      }
    },
    setTheme: (theme: AppState["theme"]) => {
      state = { ...state, theme };
      notify();
    },
    setWaWebVisible: (visible: boolean) => {
      state = { ...state, showWaWeb: visible };
      notify();
    },
    setWaWebStep: (step: AppState["waWebStep"]) => {
      state = { ...state, waWebStep: step };
      notify();
    },
  };
};

// Bootstrap store
export async function bootstrapStore() {
  try {
    const token = await getSecureItem("auth_token");
    const userStr = await getSecureItem("auth_user");
    const user = userStr ? JSON.parse(userStr) : null;
    const persistedApiUrl = await getSecureItem("api_url");
    state = {
      ...state,
      token,
      user,
      apiUrl: persistedApiUrl || state.apiUrl,
    };
    notify();
  } catch (err) {
    console.error("Bootstrapping auth store failed:", err);
  }
}
