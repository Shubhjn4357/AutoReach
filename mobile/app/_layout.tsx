import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { initDb } from "../services/db";
import { bootstrapStore, useAppStore } from "../services/store";
import { ThemeProvider, useTheme } from "../services/theme";

function InnerRootLayout() {
  const { colors } = useTheme();
  const store = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (store.token === null) {
      router.replace("/auth");
    }
  }, [store.token]);

  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: "bold" },
      contentStyle: { backgroundColor: colors.bg }
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="contact/[id]" options={{ title: "Contact Details" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDb();
        await bootstrapStore();
        setDbReady(true);
      } catch (error) {
        console.error("Bootstrapping mobile database failed:", error);
      }
    }
    bootstrap();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E6BFF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <InnerRootLayout />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center"
  }
});
