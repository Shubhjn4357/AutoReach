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
  theme: "dark"
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
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
          await SecureStore.setItemAsync("auth_token", token);
        } else {
          await SecureStore.deleteItemAsync("auth_token");
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
    }
  };
};

// Bootstrap store
export async function bootstrapStore() {
  try {
    const token = await SecureStore.getItemAsync("auth_token");
    state = { ...state, token };
    notify();
  } catch (err) {
    console.error("Bootstrapping auth store failed:", err);
  }
}
