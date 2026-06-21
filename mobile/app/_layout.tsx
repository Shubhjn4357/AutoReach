import React, { useEffect, useState } from "react";
import { Stack, useRouter } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";
import { Host } from "@expo/ui";
import { initDb } from "../services/db";
import { bootstrapStore, useAppStore, getSecureItem } from "../services/store";
import { ThemeProvider, useTheme } from "../services/theme";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// Keep splash screen visible until custom assets are ready
SplashScreen.preventAutoHideAsync();

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  console.log("[Background Task] Running background schedule check...");
  try {
    const enabled = await getSecureItem("reminder_enabled");
    const time = await getSecureItem("reminder_time"); // HH:MM
    if (enabled === "true" && time) {
      const [hourStr, minStr] = time.split(":");
      const hour = parseInt(hourStr) || 9;
      const minute = parseInt(minStr) || 0;

      const now = new Date();
      if (
        now.getHours() === hour &&
        now.getMinutes() >= minute &&
        now.getMinutes() < minute + 15
      ) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "AutoReach Daily Follow-up",
            body: "Don't forget to check your hot pipelines and dispatch outbound campaigns today!",
            sound: true,
          },
          trigger: null,
        });
      }
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background task failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

function InnerRootLayout() {
  const { colors, theme } = useTheme();
  const store = useAppStore();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Sync system UI color base
        await SystemUI.setBackgroundColorAsync(
          theme === "dark" ? "#050505" : "#F8FAFC",
        );

        // Bootstrap local state (token)
        await bootstrapStore();

        // Register push/local notification settings
        await registerForPushNotificationsAsync();

        // Register background task
        try {
          const isRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK,
          );
          if (!isRegistered) {
            await BackgroundTask.registerTaskAsync(
              BACKGROUND_NOTIFICATION_TASK,
              {
                minimumInterval: 15 * 60,
              },
            );
            console.log("[Background Task] Registered successfully");
          }
        } catch (bgErr) {
          console.warn("Background task registration failed:", bgErr);
        }

        // Perform initial routing check
        const completed = await getSecureItem("onboarding_completed");
        if (completed !== "true") {
          router.replace("/onboarding");
        } else if (store.token === null) {
          router.replace("/auth");
        }
      } catch (e) {
        console.warn("Prepare layout failed", e);
      } finally {
        setAppReady(true);
        // Hide splash screen
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, [theme]);

  useEffect(() => {
    if (!appReady) return;
    async function checkNav() {
      const completed = await getSecureItem("onboarding_completed");
      if (completed !== "true") {
        router.replace("/onboarding");
      } else if (store.token === null) {
        router.replace("/auth");
      } else {
        router.replace("/(tabs)");
      }
    }
    checkNav();
  }, [store.token, appReady]);

  return (
    <Host style={{ flex: 1 }}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="contact/[id]"
          options={{ headerShown:false }}
        />
      </Stack>
    </Host>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SQLiteProvider databaseName="autoreach.db" onInit={initDb}>
        <ThemeProvider>
          <InnerRootLayout />
        </ThemeProvider>
      </SQLiteProvider>
    </QueryClientProvider>
  );
}
