import React, { useEffect, useState, useRef } from "react";
import { Stack, useRouter } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import * as Notifications from "expo-notifications";

import { initDb, getPendingWhatsAppMessages, updateWhatsAppMessageStatus, logSentMessage } from "../services/db";
import { bootstrapStore, useAppStore, getSecureItem, saveSecureItem } from "../services/store";
import { ThemeProvider, useTheme } from "../services/theme";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WebView } from "react-native-webview";
import { APP_CONSTANTS } from "../constant";
import { StyleSheet, Pressable, View, Text, AppState } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";
const BACKGROUND_WHATSAPP_QUEUE = "BACKGROUND_WHATSAPP_QUEUE";

// Keep splash screen visible until custom assets are ready
SplashScreen.preventAutoHideAsync();

TaskManager.defineTask(BACKGROUND_WHATSAPP_QUEUE, async () => {
  console.log("[Background Task] Running background WhatsApp outbox processor...");
  try {
    const isLinked = await getSecureItem("whatsapp_linked_locally");
    const gatewayUrl = await getSecureItem("whatsapp_gateway_url");

    if (isLinked !== "true" || !gatewayUrl) {
      console.log("[Background Task] WhatsApp gateway not linked or configured. Skipping.");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    const pendingMessages = await getPendingWhatsAppMessages();
    if (pendingMessages.length === 0) {
      console.log("[Background Task] No pending WhatsApp messages found.");
      return BackgroundTask.BackgroundTaskResult.Success;
    }

    console.log(`[Background Task] Found ${pendingMessages.length} pending WhatsApp messages.`);

    for (const msg of pendingMessages) {
      await updateWhatsAppMessageStatus(msg.id, "PROCESSING");
      try {
        const cleanPhone = msg.recipientPhone.replace(/[^0-9]/g, "");
        const response = await fetch(`${gatewayUrl}/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: cleanPhone,
            message: msg.messageBody,
          }),
        });

        if (response.ok) {
          await updateWhatsAppMessageStatus(msg.id, "SENT");
          await logSentMessage("whatsapp", msg.recipientPhone, "LOCAL_GATEWAY_AUTO");
          console.log(`[Background Task] Message to ${msg.recipientPhone} sent successfully.`);
        } else {
          const errText = await response.text().catch(() => "Response not OK");
          await updateWhatsAppMessageStatus(msg.id, "FAILED", errText);
          console.warn(`[Background Task] Gateway returned error: ${errText}`);
        }
      } catch (err: any) {
        console.error(`[Background Task] Fetch error sending message:`, err);
        await updateWhatsAppMessageStatus(msg.id, "FAILED", err.message || "Network request failed");
      }
    }

    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.error("Background WhatsApp outbox task failed:", error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

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
  const { colors, theme, glassStyle } = useTheme();
  const store = useAppStore();
  const router = useRouter();
  const [appReady, setAppReady] = useState(false);
  const [isBiometricLocked, setIsBiometricLocked] = useState(false);

  const triggerBiometricUnlock = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsBiometricLocked(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Unlock AutoReach",
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsBiometricLocked(false);
      }
    } catch (e) {
      console.warn("Biometric verification failed", e);
    }
  };

  // Lock automatically on return from background
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const isLockEnabled = await getSecureItem("biometric_lock_enabled");
        if (isLockEnabled === "true") {
          setIsBiometricLocked(true);
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  // Auto-scan on mount when lock is active
  useEffect(() => {
    if (isBiometricLocked) {
      triggerBiometricUnlock();
    }
  }, [isBiometricLocked]);

  // WhatsApp local session queue processor
  const [activeJob, setActiveJob] = useState<any>(null);
  const webViewRef = useRef<any>(null);
  const isWebviewLoaded = useRef(false);
  const RNWebView = WebView as any;

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

        // Register background tasks
        try {
          const isNotificationRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_NOTIFICATION_TASK,
          );
          if (!isNotificationRegistered) {
            await BackgroundTask.registerTaskAsync(
              BACKGROUND_NOTIFICATION_TASK,
              {
                minimumInterval: 15 * 60,
              },
            );
            console.log("[Background Notification Task] Registered successfully");
          }

          const isWhatsappRegistered = await TaskManager.isTaskRegisteredAsync(
            BACKGROUND_WHATSAPP_QUEUE,
          );
          if (!isWhatsappRegistered) {
            await BackgroundTask.registerTaskAsync(
              BACKGROUND_WHATSAPP_QUEUE,
              {
                minimumInterval: 15 * 60,
              },
            );
            console.log("[Background WhatsApp Queue Task] Registered successfully");
          }
        } catch (bgErr) {
          console.warn("Background tasks registration failed:", bgErr);
        }

        // Check biometric lock on boot
        const isLockEnabled = await getSecureItem("biometric_lock_enabled");
        if (isLockEnabled === "true") {
          setIsBiometricLocked(true);
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

  // Queue polling effect
  useEffect(() => {
    if (!appReady) return;
    
    let intervalId: any;
    async function processQueue() {
      if (activeJob) return;

      const isLinked = await getSecureItem("whatsapp_linked_locally");
      if (isLinked !== "true") return;

      try {
        const pending = await getPendingWhatsAppMessages();
        if (pending.length === 0) return;

        const nextMsg = pending[0];
        setActiveJob(nextMsg);
        await updateWhatsAppMessageStatus(nextMsg.id, "PROCESSING");

        const cleanPhone = nextMsg.recipientPhone.replace(/[^0-9]/g, "");

        if (nextMsg.mediaUri) {
          try {
            const response = await fetch(nextMsg.mediaUri);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64Str = reader.result as string;
              const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
              isWebviewLoaded.current = false;
              webViewRef.current?.injectJavaScript(`window.location.href = "${waUrl}";`);

              const runImageAutomation = () => {
                if (!isWebviewLoaded.current) {
                  setTimeout(runImageAutomation, 1000);
                  return;
                }

                const escapedCaption = nextMsg.messageBody.replace(/["'\\\r\n]/g, (match) => {
                  if (match === '\r') return '';
                  if (match === '\n') return '\\n';
                  return '\\' + match;
                });

                const mediaScript = `
                  (function() {
                    let checkCount = 0;
                    const maxChecks = 40;
                    
                    async function checkImageInput() {
                      checkCount++;
                      
                      const dialogs = document.querySelectorAll('div[role="dialog"]');
                      for (const d of dialogs) {
                        if (d.textContent.includes('invalid') || d.textContent.includes('not exist') || d.textContent.includes('Invalid')) {
                          const btn = d.querySelector('button');
                          if (btn) btn.click();
                          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: 'Invalid phone number' }));
                          return;
                        }
                      }

                      const fileInput = document.querySelector('input[type="file"][accept*="image"]') || document.querySelector('input[type="file"]');
                      if (fileInput) {
                        try {
                          const base64Data = "${base64Str}";
                          const response = await fetch(base64Data);
                          const blob = await response.blob();
                          const file = new File([blob], "image.jpg", { type: "image/jpeg" });
                          
                          const dataTransfer = new DataTransfer();
                          dataTransfer.items.add(file);
                          fileInput.files = dataTransfer.files;
                          fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                          
                          let previewChecks = 0;
                          function checkPreviewSend() {
                            previewChecks++;
                            
                            const captionText = "${escapedCaption}";
                            const captionEditor = document.querySelector('div[contenteditable="true"]');
                            if (captionEditor && captionText) {
                              captionEditor.focus();
                              document.execCommand('insertText', false, captionText);
                            }
                            
                            const mediaSendBtn = document.querySelector('span[data-icon="send"]')?.closest('button') ||
                                                 document.querySelector('button[aria-label="Send"]') ||
                                                 document.querySelector('div[role="button"] span[data-icon="send"]')?.closest('button');
                            if (mediaSendBtn) {
                              mediaSendBtn.click();
                              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SENT' }));
                            } else if (previewChecks < 20) {
                              setTimeout(checkPreviewSend, 500);
                            } else {
                              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: 'Timeout waiting for media send' }));
                            }
                          }
                          setTimeout(checkPreviewSend, 1500);
                        } catch (e) {
                          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: e.message }));
                        }
                      } else if (checkCount < maxChecks) {
                        const attachBtn = document.querySelector('span[data-icon="plus"]') || document.querySelector('span[data-icon="attach-menu-portraits"]');
                        if (attachBtn) attachBtn.click();
                        setTimeout(checkImageInput, 1000);
                      } else {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: 'Timeout waiting for file input' }));
                      }
                    }
                    setTimeout(checkImageInput, 4000);
                  })();
                `;
                webViewRef.current?.injectJavaScript(mediaScript);
              };
              
              setTimeout(runImageAutomation, 3000);
            };
          } catch (fileErr: any) {
            console.error("Local file fetch error:", fileErr);
            updateWhatsAppMessageStatus(nextMsg.id, "FAILED", fileErr.message || "File read error").catch(console.warn);
            setActiveJob(null);
          }
        } else {
          const escapedText = encodeURIComponent(nextMsg.messageBody);
          const waUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${escapedText}`;
          isWebviewLoaded.current = false;
          webViewRef.current?.injectJavaScript(`window.location.href = "${waUrl}";`);

          const runTextAutomation = () => {
            if (!isWebviewLoaded.current) {
              setTimeout(runTextAutomation, 1000);
              return;
            }

            const textScript = `
              (function() {
                let checkCount = 0;
                const maxChecks = 40;
                function check() {
                  checkCount++;
                  
                  const dialogs = document.querySelectorAll('div[role="dialog"]');
                  for (const d of dialogs) {
                    if (d.textContent.includes('invalid') || d.textContent.includes('not exist') || d.textContent.includes('Invalid')) {
                      const btn = d.querySelector('button');
                      if (btn) btn.click();
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: 'Invalid phone number' }));
                      return;
                    }
                  }
                  
                  const btn = document.querySelector('span[data-icon="send"]')?.closest('button') ||
                              document.querySelector('button[aria-label="Send"]');
                  if (btn) {
                    btn.click();
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SENT' }));
                  } else if (checkCount < maxChecks) {
                    setTimeout(check, 1000);
                  } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', error: 'Timeout waiting for send button' }));
                  }
                }
                setTimeout(check, 4000);
              })();
            `;
            webViewRef.current?.injectJavaScript(textScript);
          };
          
          setTimeout(runTextAutomation, 3000);
        }

        const activeJobId = nextMsg.id;
        setTimeout(() => {
          setActiveJob((current: any) => {
            if (current && current.id === activeJobId) {
              updateWhatsAppMessageStatus(activeJobId, "FAILED", "Job timeout").catch(console.warn);
              return null;
            }
            return current;
          });
        }, 45000);

      } catch (err: any) {
        console.warn("Queue loop error:", err);
      }
    }

    intervalId = setInterval(processQueue, 5000);
    return () => clearInterval(intervalId);
  }, [appReady, activeJob]);

  const handleWebViewLoadEnd = () => {
    isWebviewLoaded.current = true;
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "LOGIN_SUCCESS") {
        await saveSecureItem("whatsapp_linked_locally", "true");
        store.setWaWebStep("success");
        setTimeout(() => {
          store.setWaWebVisible(false);
        }, 1500);
      } else if (data.type === "SENT") {
        if (activeJob) {
          await updateWhatsAppMessageStatus(activeJob.id, "SENT");
          await logSentMessage("whatsapp", activeJob.recipientPhone, "LOCAL_WEBVIEW_AUTO");
          setActiveJob(null);
        }
      } else if (data.type === "FAILED") {
        if (activeJob) {
          await updateWhatsAppMessageStatus(activeJob.id, "FAILED", data.error || "Unknown error");
          setActiveJob(null);
        }
      }
    } catch (e) {
      // Ignore non-JSON
    }
  };

  const INJECTED_LOGIN_DETECTOR = `
    (function() {
      function detect() {
        const chatPane = document.querySelector('span[data-icon="chat"]') || 
                         document.querySelector('#pane-side') || 
                         document.querySelector('div[data-icon="chat"]');
        if (chatPane) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOGIN_SUCCESS' }));
        } else {
          setTimeout(detect, 1000);
        }
      }
      detect();
    })();
  `;

  return (
    <View style={{ flex: 1 }}>
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
          options={{ headerShown: false }}
        />
      </Stack>

      {/* Global Hidden/Visible WhatsApp WebView */}
      {store.token && (
        <View style={store.showWaWeb ? styles.waWebVisible : styles.waWebHidden}>
          <View style={store.showWaWeb ? [glassStyle, styles.glassCard, { backgroundColor: colors.surface, borderColor: colors.border }] : { width: 1, height: 1 }}>
            {store.showWaWeb && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text }}>WhatsApp Web Session</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>Scan QR using Linked Devices on your phone</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => store.setWaWebVisible(false)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
            )}

            <RNWebView
              ref={webViewRef}
              source={{ uri: "https://web.whatsapp.com" }}
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              domStorageEnabled={true}
              javaScriptEnabled={true}
              originWhitelist={["*"]}
              injectedJavaScript={INJECTED_LOGIN_DETECTOR}
              onMessage={handleWebViewMessage}
              onLoadEnd={handleWebViewLoadEnd}
              style={store.showWaWeb ? { flex: 1, borderRadius: 16 } : { width: 1, height: 1, opacity: 0 }}
            />
          </View>
        </View>
      )}

      {/* Biometric Lock Overlay */}
      {isBiometricLocked && (
        <View style={[StyleSheet.absoluteFill, styles.lockOverlay, { backgroundColor: colors.bg }]}>
          <View style={[glassStyle, styles.lockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.lockIconContainer, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.lockTitle, { color: colors.text }]}>{APP_CONSTANTS.lockScreen.title}</Text>
            <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
              {APP_CONSTANTS.lockScreen.subtitle}
            </Text>
            <Pressable
              onPress={triggerBiometricUnlock}
              style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="finger-print-outline" size={16} color="#FFFFFF" />
              <Text style={styles.unlockBtnText}>{APP_CONSTANTS.lockScreen.buttonText}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
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

const styles = StyleSheet.create({
  waWebHidden: {
    position: "absolute",
    left: -1000,
    top: -1000,
    width: 1,
    height: 1,
    opacity: 0,
  },
  waWebVisible: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  glassCard: {
    width: "85%",
    height: "70%",
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 16,
  },
  lockOverlay: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999999,
  },
  lockCard: {
    width: "85%",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  lockTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  lockSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 48,
    borderRadius: 14,
  },
  unlockBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});
