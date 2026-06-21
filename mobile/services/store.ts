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
}

// Initial in-memory state
let state: AppState = {
  token: null,
  user: null,
  apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  theme: "dark",
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
    setUser: (user: AppState["user"]) => {
      state = { ...state, user };
      notify();
    },
    setApiUrl: (apiUrl: string) => {
      state = { ...state, apiUrl };
      notify();
    },
    setTheme: (theme: AppState["theme"]) => {
      state = { ...state, theme };
      notify();
    },
  };
};

// Bootstrap store
export async function bootstrapStore() {
  try {
    const token = await getSecureItem("auth_token");
    state = { ...state, token };
    notify();
  } catch (err) {
    console.error("Bootstrapping auth store failed:", err);
  }
}
