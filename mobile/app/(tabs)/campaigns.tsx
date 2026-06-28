import  { useEffect, useState, useRef } from "react";
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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  getLocalTemplates,
  createLocalTemplate,
  deleteLocalTemplate,
  getSentMessageStats,
  MessageTemplate,
  MessageStats,
  createLocalCampaign,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { Ionicons } from "@expo/vector-icons";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { APP_CONSTANTS } from "../../constant";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import * as ImagePicker from "expo-image-picker";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  hapticLight,
  hapticSuccess,
  hapticWarning,
} from "../../services/haptics";

import { Suspense } from "react";

export default function CampaignsScreen() {
  const { colors } = useTheme();
  const [isTransitionFinished, setIsTransitionFinished] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTransitionFinished(true);
    }, 150);
    return () => clearTimeout(timeout);
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
  const templateBodyRef = useRef<TextInput>(null);

  // Campaign Scheduling State
  const [newCampaignName, setNewCampaignName] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const loadData = async () => {};

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
      : leads.filter((l: Lead) => l.status === targetStage);

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleScheduleCampaign = async () => {
    if (!newCampaignName.trim()) {
      showCustomAlert("Error", "Please enter a campaign name.", "error");
      return;
    }
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

    setCampaignLoading(true);
    try {
      const campaignId = `camp_${Math.random().toString(36).substring(2, 9)}`;
      
      const newCampaign = {
        id: campaignId,
        name: newCampaignName.trim(),
        messageTemplateId: selectedTemplateId,
        status: "scheduled",
        mediaUrl: campaignImageUri || null,
        scheduledAt: scheduledDateTime.getTime(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const recipientIds = targetLeads.map((l) => l.id);

      await createLocalCampaign(newCampaign, recipientIds);

      hapticSuccess();
      showCustomAlert(
        "Campaign Scheduled",
        `Campaign "${newCampaignName}" scheduled successfully for ${scheduledDateTime.toLocaleString()} (${targetLeads.length} recipients)!`,
        "success",
      );
      
      setNewCampaignName("");
      setCampaignImageUri(null);
    } catch (err) {
      console.warn("Failed to schedule campaign", err);
      showCustomAlert("Error", "Failed to schedule campaign.", "error");
    } finally {
      setCampaignLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
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
              <IconButton
                icon="add-circle"
                onPress={() => setTemplateModalVisible(true)}
                bgColor={colors.primarySoft}
                color={colors.primary}
                size={18}
                style={{ width: 32, height: 32, borderRadius: 10 }}
              />
            </View>

            <ScrollView style={styles.templatesList} nestedScrollEnabled>
              {templates.map((template: MessageTemplate) => (
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


          {/* Campaign Scheduler Form */}
          <View
            style={[
              glassStyle,
              styles.sectionCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Schedule Message Campaign
            </Text>
            <Text
              style={[
                styles.reminderSubtitle,
                { color: colors.textSecondary, marginBottom: 16 },
              ]}
            >
              Compose and queue a campaign for CRM leads.
            </Text>

            {/* Campaign Name Input */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Campaign Name
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                    marginTop: 6,
                    marginBottom: 12,
                  },
                ]}
                placeholder="e.g. July Promotion Campaign"
                placeholderTextColor={colors.textSecondary + "90"}
                value={newCampaignName}
                onChangeText={setNewCampaignName}
              />
            </View>

            {/* Target Stage Select */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Target CRM Stage
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginBottom: 12 }}>
                {["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"].map((stage) => {
                  const isSelected = targetStage === stage;
                  return (
                    <Pressable
                      key={stage}
                      onPress={() => { hapticLight(); setTargetStage(stage as LeadStatus | "ALL"); }}
                      style={[
                        styles.stagePill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.bg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stagePillText,
                          { color: isSelected ? "#fff" : colors.textSecondary },
                        ]}
                      >
                        {stage}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Message Template Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Select Message Template
              </Text>
              {templates.length === 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: "italic", marginBottom: 12 }}>
                  No templates registered. Please add a template first.
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginBottom: 12 }}>
                  {templates.map((template: MessageTemplate) => {
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <Pressable
                        key={template.id}
                        onPress={() => { hapticLight(); setSelectedTemplateId(template.id); }}
                        style={[
                          styles.templatePill,
                          {
                            backgroundColor: isSelected ? colors.primarySoft : colors.bg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.templatePillText,
                            { color: isSelected ? colors.primary : colors.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {template.title}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Scheduled Date & Time Pickers */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Scheduled Date & Time
              </Text>
              <View style={[styles.dateTimeRow, { marginBottom: 12 }]}>
                <Pressable
                  onPress={() => { hapticLight(); setShowDatePicker(true); }}
                  style={[
                    styles.dateTimeButton,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                    {scheduledDateTime.toLocaleDateString()}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => { hapticLight(); setShowTimePicker(true); }}
                  style={[
                    styles.dateTimeButton,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.dateTimeButtonText, { color: colors.text }]}>
                    {String(scheduledDateTime.getHours()).padStart(2, "0")}:{String(scheduledDateTime.getMinutes()).padStart(2, "0")}
                  </Text>
                </Pressable>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDateTime}
                  mode="date"
                  onChange={(_event: unknown, date?: Date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) {
                      const newDate = new Date(scheduledDateTime);
                      newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setScheduledDateTime(newDate);
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDateTime}
                  mode="time"
                  onChange={(_event: unknown, date?: Date) => {
                    setShowTimePicker(Platform.OS === "ios");
                    if (date) {
                      const newDate = new Date(scheduledDateTime);
                      newDate.setHours(date.getHours(), date.getMinutes(), 0, 0);
                      setScheduledDateTime(newDate);
                    }
                  }}
                />
              )}
            </View>

            {/* Campaign Channel Selection */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Campaign Channel
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                {(["whatsapp", "sms"] as const).map((channel) => {
                  const isSelected = campaignChannel === channel;
                  return (
                    <Pressable
                      key={channel}
                      onPress={() => { hapticLight(); setCampaignChannel(channel); }}
                      style={[
                        styles.channelSelectBtn,
                        {
                          backgroundColor: isSelected ? colors.primarySoft : colors.bg,
                          borderColor: isSelected ? colors.primary : colors.border,
                          flex: 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={channel === "whatsapp" ? "logo-whatsapp" : "chatbubble-outline"}
                        size={16}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.channelSelectBtnText,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {channel === "whatsapp" ? "WhatsApp" : "SMS App"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Drag & Drop styled Image Poster Dropzone */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                Image Poster Attachment (Optional)
              </Text>
              {campaignImageUri ? (
                <View
                  style={[
                    styles.imagePreviewContainer,
                    { backgroundColor: colors.bg, borderColor: colors.border, marginBottom: 12 },
                  ]}
                >
                  <Image
                    source={{ uri: campaignImageUri }}
                    style={styles.imagePreview}
                  />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                      Attached Image Poster
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      Will be dispatched with template body.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => { hapticLight(); setCampaignImageUri(null); }}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickCampaignImage}
                  style={[
                    styles.dropzoneContainer,
                    { backgroundColor: colors.bg, borderColor: colors.border, marginBottom: 12 },
                  ]}
                >
                  <Ionicons name="cloud-upload-outline" size={28} color={colors.textSecondary} />
                  <Text style={[styles.dropzoneText, { color: colors.text }]}>
                    Select Poster Image
                  </Text>
                  <Text style={[styles.dropzoneSubtext, { color: colors.textSecondary }]}>
                    Supports JPG, PNG (automatically converted)
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Recipients Counter Badge */}
            <View
              style={[
                styles.recipientsBadge,
                {
                  backgroundColor: targetLeads.length > 0 ? colors.successSoft : colors.dangerSoft,
                  borderColor: targetLeads.length > 0 ? colors.success + "30" : colors.danger + "30",
                  marginBottom: 12,
                },
              ]}
            >
              <Ionicons
                name={targetLeads.length > 0 ? "checkmark-circle" : "alert-circle"}
                size={16}
                color={targetLeads.length > 0 ? colors.success : colors.danger}
              />
              <Text
                style={{
                  color: targetLeads.length > 0 ? colors.success : colors.danger,
                  fontSize: 12,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {targetLeads.length > 0
                  ? `Target Stage matches ${targetLeads.length} leads`
                  : "No CRM leads match selected stage"}
              </Text>
            </View>

            {/* Schedule Button */}
            <Pressable
              disabled={campaignLoading}
              onPress={handleScheduleCampaign}
              style={[
                styles.scheduleBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: campaignLoading ? 0.6 : 1,
                },
              ]}
            >
              {campaignLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="calendar" size={18} color="#fff" />
                  <Text style={styles.scheduleBtnText}>Schedule Campaign</Text>
                </>
              )}
            </Pressable>
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

                <Button
                  label="Save Template"
                  onPress={handleSaveTemplate}
                  variant="primary"
                  style={{ marginTop: 16 }}
                />
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
    </View>
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
  inputContainer: {
    width: "100%",
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  stagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    height: 32,
    justifyContent: "center",
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  templatePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    height: 32,
    justifyContent: "center",
    maxWidth: 150,
  },
  templatePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  dateTimeButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  channelSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
  },
  channelSelectBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  dropzoneContainer: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dropzoneText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  dropzoneSubtext: {
    fontSize: 10,
    marginTop: 2,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  imagePreview: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  recipientsBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 46,
    borderRadius: 12,
    width: "100%",
  },
  scheduleBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});
