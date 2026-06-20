import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { initDb } from "../services/db";
import { bootstrapStore } from "../services/store";
import * as SecureStore from "expo-secure-store";
import { ThemeProvider, useTheme } from "../tw/index";

function InnerRootLayout() {
  const { colors } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: "bold" },
      contentStyle: { backgroundColor: colors.bg }
    }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDb();
        const currentToken = await SecureStore.getItemAsync("auth_token");
        if (!currentToken) {
          await SecureStore.setItemAsync("auth_token", "mock_shubham_token");
        }
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
