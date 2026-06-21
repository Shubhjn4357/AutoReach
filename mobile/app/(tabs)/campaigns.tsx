import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
  InteractionManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  getLocalTemplates,
  createLocalTemplate,
  deleteLocalTemplate,
  getSentMessageStats,
  logSentMessage,
  MessageTemplate,
  MessageStats,
  enqueueWhatsAppMessage,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { Ionicons } from "@expo/vector-icons";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { getSecureItem, saveSecureItem, useAppStore } from "../../services/store";
import { Host, Switch } from "@expo/ui";
import { APP_CONSTANTS } from "../../constant";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import * as ImagePicker from "expo-image-picker";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
} from "../../services/haptics";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

import { Suspense } from "react";

export default function CampaignsScreen() {
  const { colors } = useTheme();
  const [isTransitionFinished, setIsTransitionFinished] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsTransitionFinished(true);
    });
    return () => task.cancel();
  }, []);

  if (!isTransitionFinished) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Suspense fallback={
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    }>
      <CampaignsScreenContent />
    </Suspense>
  );
}

function CampaignsScreenContent() {
  const { colors, glassStyle, glassInputStyle } = useTheme();
  const store = useAppStore();
  const queryClient = useQueryClient();


  // Suspense Queries
  const { data: leads = [] } = useSuspenseQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLocalLeads,
  });

  const { data: templates = [] } = useSuspenseQuery<MessageTemplate[]>({
    queryKey: ["templates"],
    queryFn: getLocalTemplates,
  });

  const { data: stats } = useSuspenseQuery<MessageStats>({
    queryKey: ["stats"],
    queryFn: getSentMessageStats,
  });

  // Bulk Campaign Configuration
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [targetStage, setTargetStage] = useState<LeadStatus | "ALL">("NEW");
  const [campaignChannel, setCampaignChannel] = useState<"whatsapp" | "sms">(
    "whatsapp",
  );
  const [campaignLoading, setCampaignLoading] = useState(false);

  // Campaign Image Picker State
  const [campaignImageUri, setCampaignImageUri] = useState<string | null>(null);
  const [waLocalLinked, setWaLocalLinked] = useState(false);

  const handlePickCampaignImage = async () => {
    hapticLight();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCampaignImageUri(result.assets[0].uri);
    }
  };

  // Template Modal State
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [templateBodySelection, setTemplateBodySelection] = useState({ start: 0, end: 0 });
  const templateBodyRef = useRef<any>(null);

  // Reminder Configuration State
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Reusable custom alert configuration
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

  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      // Load reminder configuration
      const enabled = await getSecureItem("reminder_enabled");
      const timeStr = await getSecureItem("reminder_time");
      setReminderEnabled(enabled === "true");
      if (timeStr) {
        const [h, m] = timeStr.split(":").map(Number);
        const d = new Date();
        d.setHours(h || 9, m || 0, 0, 0);
        setReminderTime(d);
      }

      // Load local WhatsApp link status
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      setWaLocalLinked(isLinked === "true");
    } catch (e) {
      console.warn("Failed to load campaigns workspace", e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadData(),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["templates"] }),
      queryClient.invalidateQueries({ queryKey: ["stats"] }),
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  useEffect(() => {
    (async () => {
      const isLinked = await getSecureItem("whatsapp_linked_locally");
      setWaLocalLinked(isLinked === "true");
    })();
  }, [store.showWaWeb]);

  // Prepopulate default templates if none exist
  useEffect(() => {
    async function seedTemplates() {
      const localTemplates = await getLocalTemplates();
      if (localTemplates.length === 0) {
        await createLocalTemplate(
          "t_1",
          "Initial Outreach Pitch",
          "Hi [Name], I noticed your details in our system. Are you free for a quick 5-min talk tomorrow about AutoReach?",
        );
        await createLocalTemplate(
          "t_2",
          "Proposal Agreement follow-up",
          "Hello [Name], following up on the proposal we sent. Let me know if you have any questions before signing!",
        );
        await loadData();
      }
    }
    seedTemplates();
  }, []);

  const handleSaveTemplate = async () => {
    const title = newTemplateTitle.trim();
    const body = newTemplateBody.trim();
    if (!title || !body) {
      hapticWarning();
      showCustomAlert("Error", "Please fill in title and body", "error");
      return;
    }
    const newId = `t_${Math.random().toString(36).substring(2, 9)}`;
    await createLocalTemplate(newId, title, body);
    hapticSuccess();
    setNewTemplateTitle("");
    setNewTemplateBody("");
    setTemplateBodySelection({ start: 0, end: 0 });
    setTemplateModalVisible(false);
    await loadData();
    showCustomAlert("Success", "Template created successfully.", "success");
  };

  const insertVariable = (variable: string) => {
    hapticLight();
    const { start, end } = templateBodySelection;
    const before = newTemplateBody.slice(0, start);
    const after = newTemplateBody.slice(end);
    const inserted = `${before}${variable}${after}`;
    setNewTemplateBody(inserted);
    const newPos = start + variable.length;
    setTemplateBodySelection({ start: newPos, end: newPos });
    // Keep focus on the input
    templateBodyRef.current?.focus();
  };

  const handleDeleteTemplate = async (id: string) => {
    showCustomAlert(
      "Delete Template",
      "Are you sure you want to delete this message template?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteLocalTemplate(id);
            if (selectedTemplateId === id) setSelectedTemplateId("");
            await loadData();
          },
        },
      ],
    );
  };

  // Get active leads for campaign selection
  const targetLeads =
    targetStage === "ALL"
      ? leads
      : leads.filter((l) => l.status === targetStage);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  const executeBulkCampaign = async () => {
    if (!selectedTemplateId || !activeTemplate) {
      showCustomAlert("Error", "Please select a message template", "error");
      return;
    }
    if (targetLeads.length === 0) {
      showCustomAlert(
        "No Recipients",
        "There are no contacts matching the target stage.",
        "warning",
      );
      return;
    }

    const campaignImg = campaignImageUri;

    showCustomAlert(
      "Confirm Campaign",
      `Send "${activeTemplate.title}" to ${targetLeads.length} recipients via ${campaignChannel.toUpperCase()}?`,
      "info",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Campaign",
          onPress: async () => {
            setCampaignLoading(true);
            try {
              let sentCount = 0;
              let enqueuedCount = 0;
              for (const lead of targetLeads) {
                if (!lead.phone) continue;

                const personalizedMsg = activeTemplate.body
                  .replace(/\[Name\]/gi, lead.name)
                  .replace(/\[Value\]/gi, "");

                if (campaignChannel === "whatsapp") {
                  await enqueueWhatsAppMessage(lead.phone, personalizedMsg, campaignImg || undefined);
                  enqueuedCount++;
                } else {
                  const encodedText = encodeURIComponent(personalizedMsg);
                  const separator = Platform.OS === "ios" ? "&" : "?";
                  const url = `sms:${lead.phone}${separator}body=${encodedText}`;

                  try {
                    const canOpen = await Linking.canOpenURL(url);
                    if (canOpen) {
                      await Linking.openURL(url);
                      await logSentMessage(
                        "sms",
                        lead.phone,
                        "CAMPAIGN_DIRECT",
                      );
                      sentCount++;
                    }
                  } catch (err) {
                    console.warn("Failed to open linking URL", err);
                  }
                }
              }

              setCampaignImageUri(null); // Clear selected image
              await loadData();
              
              if (campaignChannel === "whatsapp") {
                showCustomAlert(
                  "Campaign Dispatched",
                  `Enqueued ${enqueuedCount} messages in local outbox queue for background dispatch.`,
                  "success"
                );
              } else {
                showCustomAlert(
                  "Campaign Completed",
                  `Launched ${sentCount} custom message redirects. Logged stats.`,
                  "success",
                );
              }
            } catch (err) {
              showCustomAlert("Error", "Failed to run campaign.", "error");
            } finally {
              setCampaignLoading(false);
            }
          },
        },
      ],
    );
  };

  // Configure Daily Notifications Reminders
  const handleToggleReminder = async (enabled: boolean) => {
    hapticMedium();
    setReminderEnabled(enabled);
    await saveSecureItem("reminder_enabled", enabled ? "true" : "false");

    if (enabled) {
      const hour = reminderTime.getHours();
      const minute = reminderTime.getMinutes();
      const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      // Cancel previous alerts
      await Notifications.cancelAllScheduledNotificationsAsync();

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "AutoReach Reminder",
            body: "Time to check your deal funnel pipelines and follow up with hot leads!",
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });

        // Register/Confirm background task
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
          }
        } catch (errTask) {
          console.warn("BG task fail", errTask);
        }

        showCustomAlert(
          "Reminders Enabled",
          `Scheduled daily follow-up notifications at ${timeStr}.`,
          "success",
        );
      } catch (e) {
        showCustomAlert("Error", "Could not schedule reminders", "error");
        setReminderEnabled(false);
        await saveSecureItem("reminder_enabled", "false");
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      try {
        const isRegistered = await TaskManager.isTaskRegisteredAsync(
          BACKGROUND_NOTIFICATION_TASK,
        );
        if (isRegistered) {
          await BackgroundTask.unregisterTaskAsync(
            BACKGROUND_NOTIFICATION_TASK,
          );
        }
      } catch (errUnreg) {
        console.warn("BG task unreg fail", errUnreg);
      }
      showCustomAlert(
        "Reminders Disabled",
        "Cancelled all repeating alerts.",
        "info",
      );
    }
  };

  const handleTimeChange = async (date: Date) => {
    setReminderTime(date);
    const h = date.getHours();
    const m = date.getMinutes();
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    await saveSecureItem("reminder_time", timeStr);
    // Re-schedule if already enabled
    if (reminderEnabled) {
      await handleToggleReminder(true);
    }
  };

  return (
    <Host style={{ flex: 1 }}>
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {APP_CONSTANTS.campaigns.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {APP_CONSTANTS.campaigns.subtitle}
            </Text>
          </View>

          {/* Messaging Stats Panel */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Outbound Volume Logs
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {stats.totalSent}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Total Sent
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {stats.whatsappCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  WhatsApp
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: colors.accent }]}>
                  {stats.smsCount}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  SMS App
                </Text>
              </View>
            </View>
          </View>

          {/* Templates Manager Panel */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Templates
              </Text>
              <Pressable
                onPress={() => setTemplateModalVisible(true)}
                style={styles.addTemplateBtn}
              >
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text
                  style={[styles.addTemplateBtnText, { color: colors.primary }]}
                >
                  Add
                </Text>
              </Pressable>
            </View>

            <ScrollView style={styles.templatesList} nestedScrollEnabled>
              {templates.map((template) => (
                <View
                  key={template.id}
                  style={[
                    styles.templateItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.templateItemHeader}>
                    <Text
                      style={[styles.templateTitle, { color: colors.text }]}
                    >
                      {template.title}
                    </Text>
                    <Pressable
                      onPress={() => handleDeleteTemplate(template.id)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.danger}
                      />
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      styles.templateBody,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {template.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Bulk Messaging Sender Card */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Bulk outreach Campaign
            </Text>

            {/* Target Stage Filter */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Target Funnel Stage
            </Text>
            <View style={styles.stagesRow}>
              {(["NEW", "CONTACTED", "QUALIFIED", "ALL"] as const).map(
                (stage) => (
                  <Pressable
                    key={stage}
                    onPress={() => { hapticLight(); setTargetStage(stage); }}
                    style={[
                      styles.filterBtn,
                      targetStage === stage
                        ? { backgroundColor: colors.primary }
                        : {
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterBtnText,
                        targetStage === stage
                          ? { color: "#FFFFFF" }
                          : { color: colors.textSecondary },
                      ]}
                    >
                      {stage}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>

            {/* Select Template Dropdown */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Outreach Template
            </Text>
            <View style={styles.templatesSelectRow}>
              {templates.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => { hapticLight(); setSelectedTemplateId(t.id); }}
                  style={[
                    styles.templateSelectBtn,
                    selectedTemplateId === t.id
                      ? {
                          borderColor: colors.primary,
                          backgroundColor: `${colors.primary}1A`,
                        }
                      : {
                          borderColor: colors.border,
                          backgroundColor: colors.bg,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.templateSelectBtnText,
                      selectedTemplateId === t.id
                        ? { color: colors.primary }
                        : { color: colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {t.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Channel Select Row */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Messaging Channel
            </Text>
            <View style={styles.channelRow}>
              <Pressable
                onPress={() => { hapticLight(); setCampaignChannel("whatsapp"); }}
                style={[
                  styles.channelBtn,
                  campaignChannel === "whatsapp"
                    ? {
                        backgroundColor: `${colors.success}1A`,
                        borderColor: colors.success,
                      }
                    : {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={16}
                  color={
                    campaignChannel === "whatsapp"
                      ? colors.success
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.channelBtnText,
                    campaignChannel === "whatsapp"
                      ? { color: colors.success }
                      : { color: colors.textSecondary },
                  ]}
                >
                  WhatsApp
                </Text>
              </Pressable>

              <Pressable
                onPress={() => { hapticLight(); setCampaignChannel("sms"); }}
                style={[
                  styles.channelBtn,
                  campaignChannel === "sms"
                    ? {
                        backgroundColor: `${colors.primary}1A`,
                        borderColor: colors.primary,
                      }
                    : {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={
                    campaignChannel === "sms"
                      ? colors.primary
                      : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.channelBtnText,
                    campaignChannel === "sms"
                      ? { color: colors.primary }
                      : { color: colors.textSecondary },
                  ]}
                >
                  SMS App
                </Text>
              </Pressable>
            </View>

            {/* Campaign Image Upload Option */}
            {campaignChannel === "whatsapp" && (
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 0 }]}>
                  Campaign Image (Optional)
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
                  <Pressable
                    onPress={handlePickCampaignImage}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary + "30",
                      borderWidth: 1.5,
                      paddingHorizontal: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6
                    }}
                  >
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                      {campaignImageUri ? "Change Image" : "Upload Image"}
                    </Text>
                  </Pressable>
                  {campaignImageUri && (
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bg, paddingHorizontal: 10, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ fontSize: 11, color: colors.text }} numberOfLines={1}>
                        {campaignImageUri.split('/').pop()}
                      </Text>
                      <Pressable onPress={() => setCampaignImageUri(null)} style={{ padding: 2 }}>
                        <Ionicons name="close-circle" size={16} color={colors.danger} />
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Trigger Button */}
            <Pressable
              onPress={() => { hapticHeavy(); executeBulkCampaign(); }}
              disabled={campaignLoading}
              style={[styles.triggerBtn, { backgroundColor: colors.primary }]}
            >
              {campaignLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.triggerBtnText}>
                    Send Campaign to {targetLeads.length} leads
                  </Text>
                  <Ionicons
                    name="send"
                    size={14}
                    color="#FFFFFF"
                    style={styles.triggerIcon}
                  />
                </>
              )}
            </Pressable>
          </View>

          {/* Daily Reminders Scheduler Panel */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.reminderHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Daily Reminders
                </Text>
                <Text
                  style={[
                    styles.reminderSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Send follow-up alerts to yourself
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
              />
            </View>

            {/* Native Time Picker */}
            <View style={styles.timePickerContainer}>
              <View style={[
                styles.timeDisplayBtn,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary + "40",
                }
              ]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.timeDisplayText, { color: colors.primary }]}>
                  {String(reminderTime.getHours()).padStart(2, "0")}:{String(reminderTime.getMinutes()).padStart(2, "0")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  onChange={(event: any, date?: Date) => {
                    if (date) handleTimeChange(date);
                  }}
                  display="spinner"
                />
              </View>
            </View>

            {reminderEnabled && (
              <View style={[
                styles.reminderActiveBadge,
                { backgroundColor: colors.successSoft, borderColor: colors.success + "40" }
              ]}>
                <Ionicons name="notifications" size={14} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: "600", marginLeft: 6 }}>
                  Active · Daily at {String(reminderTime.getHours()).padStart(2, "0")}:{String(reminderTime.getMinutes()).padStart(2, "0")}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Template Modal */}
        {templateModalVisible && (
          <Modal
            transparent
            visible={templateModalVisible}
            animationType="slide"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <View style={styles.modalOverlay}>
                <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Create Template
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Pressable
                    onPress={() => setTemplateModalVisible(false)}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>

                <TextInput
                  value={newTemplateTitle}
                  onChangeText={setNewTemplateTitle}
                  placeholder="Template Title (e.g. Outreach)"
                  placeholderTextColor={colors.textMuted}
                  style={[glassInputStyle, styles.input]}
                />

                {/* Variable Chip Buttons */}
                <View style={styles.varChipsLabel}>
                  <Ionicons name="code-slash-outline" size={13} color={colors.primary} />
                  <Text style={[styles.varChipsLabelText, { color: colors.textSecondary }]}>
                    Tap to insert variable
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.varChipsScroll}
                  contentContainerStyle={styles.varChipsRow}
                  keyboardShouldPersistTaps="always"
                >
                  {[
                    { label: "[Name]", color: colors.primary },
                    { label: "[Phone]", color: colors.accent },
                    { label: "[Email]", color: colors.warning },
                    { label: "[Date]", color: colors.danger },
                    { label: "[Company]", color: colors.textSecondary },
                  ].map((v) => (
                    <Pressable
                      key={v.label}
                      onPress={() => insertVariable(v.label)}
                      style={[
                        styles.varChip,
                        {
                          backgroundColor: `${v.color}18`,
                          borderColor: `${v.color}50`,
                        },
                      ]}
                    >
                      <Text style={[styles.varChipText, { color: v.color }]}>
                        {v.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <TextInput
                  ref={templateBodyRef}
                  value={newTemplateBody}
                  onChangeText={setNewTemplateBody}
                  onSelectionChange={(e) =>
                    setTemplateBodySelection(e.nativeEvent.selection)
                  }
                  selection={templateBodySelection}
                  placeholder="Message body. Tap {} chips above to insert variables."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[glassInputStyle, styles.input, styles.multilineInput]}
                />

                <Pressable
                  onPress={handleSaveTemplate}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Template</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        )}

        {/* Custom Reusable Alert */}
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
      </SafeAreaView>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 110,
    gap: 20,
  },
  headerContainer: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  sectionCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addTemplateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addTemplateBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  templatesList: {
    maxHeight: 180,
  },
  templateItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  templateItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  templateTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  templateBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  stagesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterBtn: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  templatesSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  templateSelectBtn: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  templateSelectBtnText: {
    fontSize: 11,
    fontWeight: "500",
  },
  channelRow: {
    flexDirection: "row",
    gap: 12,
  },
  channelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  channelBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  triggerBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 20,
  },
  triggerBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  triggerIcon: {
    marginLeft: 8,
  },
  reminderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  timePickerContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    alignItems: "center",
  },
  timeInput: {
    flex: 1,
    height: 40,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "bold",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  saveTimeBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveTimeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 24,
  },
  modalCard: {
    padding: 24,
    borderRadius: 20,
    width: "100%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 4,
  },
  input: {
    height: 44,
    marginBottom: 12,
    width: "100%",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  multilineInput: {
    height: 110,
    textAlignVertical: "top",
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    width: "100%",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  varChipsLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  varChipsLabelText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  varChipsScroll: {
    marginBottom: 10,
  },
  varChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 4,
  },
  varChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  varChipText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  timeDisplayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    alignSelf: "flex-start",
  },
  timeDisplayText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  reminderActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
