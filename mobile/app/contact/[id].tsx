import React, { useEffect, useState, Suspense } from "react";
import {
  ActivityIndicator,
  
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { useTheme } from "../../services/theme";
import {
  getLocalLead,
  updateLocalLead,
  deleteLocalLead,
  logSentMessage,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { recommendNextStep } from "../../shared/crm";
import { Ionicons } from "@expo/vector-icons";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { StatusBadge } from "../../components/StatusBadge";
import { BottomDrawer } from "../../components/BottomDrawer";
import { IconButton } from "../../components/IconButton";
import { Button } from "../../components/Button";
import { PillButton } from "../../components/PillButton";
import { SectionLabel } from "../../components/SectionLabel";

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { ContactDetailSkeleton } from "../../components/Skeleton";

interface AiAuditResult {
  score: number;
  grade: string;
  summary: string;
  suggestedAction: string;
  proposedQuickReply?: string;
}

interface RawSqlLead {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  value: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

import { useThrottle } from "../../hook/useThrottle";

export default function ContactDetailScreen() {
  return (
    <Suspense fallback={<ContactDetailSkeleton />}>
      <ContactDetailScreenContent />
    </Suspense>
  );
}

function ContactDetailScreenContent() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, glassStyle, glassInputStyle } = useTheme();

  const [isTransitionFinished, setIsTransitionFinished] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTransitionFinished(true);
    }, 150);
    return () => clearTimeout(timeout);
  }, []);

  const { data: lead, isLoading } = useQuery<Lead | null>({
    queryKey: ["lead", id],
    queryFn: () => getLocalLead(id),
    enabled: isTransitionFinished && !!id,
  });

  // Modal & Form States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
    status: "NEW" as LeadStatus,
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone || "",
        notes: lead.notes || "",
        status: lead.status,
      });
    }
  }, [lead]);

  // AI CRM Agent State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiAuditResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Custom Alert State
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

  const handleUpdate = async () => {
    const name = formData.name.trim();
    if (!name) {
      showCustomAlert("Error", "Name is required", "error");
      return;
    }
    if (!lead) return;

    const updated: Lead = {
      ...lead,
      name,
      value: lead.value,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      status: formData.status,
      notes: formData.notes.trim(),
      updatedAt: Date.now(),
    };

    try {
      await updateLocalLead(updated);
      setEditModalVisible(false);
      await queryClient.invalidateQueries({ queryKey: ["lead", id] });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      showCustomAlert("Success", "Contact details updated.", "success");
    } catch (err) {
      showCustomAlert("Error", "Could not save details", "error");
    }
  };

  const throttledUpdate = useThrottle(handleUpdate, 2000);

  const handleDeleteLead = async () => {
    if (!lead) return;
    showCustomAlert(
      "Confirm Delete",
      `Are you sure you want to permanently delete "${lead.name}"?`,
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLocalLead(lead.id);
              await queryClient.invalidateQueries({ queryKey: ["leads"] });
              showCustomAlert(
                "Deleted",
                "Contact removed successfully.",
                "success",
                [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
              );
            } catch (e) {
              showCustomAlert("Error", "Failed to delete contact.", "error");
            }
          },
        },
      ],
    );
  };

  const handleRunAiAudit = () => {
    if (!lead) return;
    setAiLoading(true);
    setTimeout(() => {
      try {
        const action = recommendNextStep(lead);
        let score = 50;
        if (lead.status === "WON") score = 100;
        else if (lead.status === "QUALIFIED") score = 80;
        else if (lead.status === "CONTACTED") score = 65;

        const grade = score >= 80 ? "A" : score >= 65 ? "B" : "C";
        const summary = `Lead status is ${lead.status.toLowerCase()}.`;
        const proposedQuickReply = `Hi ${lead.name}, following up on our discussion!`;

        setAiResult({
          score,
          grade,
          summary,
          suggestedAction: action,
          proposedQuickReply,
        });
      } catch (err) {
        console.warn("AI audit execution error", err);
      } finally {
        setAiLoading(false);
      }
    }, 1000);
  };

  const handleSendMessage = async (
    channel: "whatsapp" | "sms",
    bodyText: string,
  ) => {
    if (!lead || !lead.phone) {
      showCustomAlert("Invalid Contact", "Phone number is missing.", "warning");
      return;
    }
    setActionLoading(true);
    const encodedText = encodeURIComponent(bodyText);
    let url = "";

    if (channel === "whatsapp") {
      const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
      url = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    } else {
      const separator = Platform.OS === "ios" ? "&" : "?";
      url = `sms:${lead.phone}${separator}body=${encodedText}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        await logSentMessage(channel, lead.phone, "DIRECT_OPEN");
        showCustomAlert(
          "Redirecting",
          `Opening native ${channel.toUpperCase()} app. Logged stats.`,
          "success",
        );
      } else {
        showCustomAlert(
          "Unsupported URL",
          `Could not launch client app for ${channel.toUpperCase()}`,
          "error",
        );
      }
    } catch (e: any) {
      showCustomAlert(
        "Linking Failed",
        e.message || "An error occurred",
        "error",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const throttledSendMessage = useThrottle(handleSendMessage, 2000);
  if (!isTransitionFinished || isLoading) {
    return (
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={{ flex: 1 }}
      >
        <ContactDetailSkeleton />
      </SafeAreaView>
    );
  }

  if (!lead) {
    return (
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <View style={[styles.loadingContainer, { backgroundColor: colors.bg }]}>
          <Text style={{ color: colors.text, fontWeight: "bold" }}>Contact not found</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 12, padding: 12, backgroundColor: colors.primary, borderRadius: 10 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
        {/* Custom Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            color={colors.primary}
            bgColor={colors.primarySoft}
          />
          <View style={{ flex: 1 }} />
          <IconButton
            icon="trash-outline"
            onPress={handleDeleteLead}
            color={colors.danger}
            bgColor={colors.dangerSoft}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Profile Card */}
          <View
            style={[
              glassStyle,
              styles.profileCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View style={styles.profileHeader}>
              <View style={styles.profileHeaderLeft}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: `${colors.primary}20`,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontWeight: "bold",
                      fontSize: 18,
                    }}
                  >
                    {lead.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.leadName, { color: colors.text }]}>
                    {lead.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    ID: {lead.id}
                  </Text>
                </View>
              </View>
              <View style={{ flex: 1 }} />
              <StatusBadge status={lead.status} />
            </View>

            <View
              style={[
                styles.detailsBox,
                { borderColor: colors.border, backgroundColor: colors.bg },
              ]}
            >
              <View style={styles.detailRow}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Email
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {lead.email || "N/A"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Phone
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={{ fontSize: 12, color: colors.text }}>
                  {lead.phone || "N/A"}
                </Text>
              </View>

              <View
                style={[styles.notesSection, { borderTopColor: colors.border }]}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  Notes Cache
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontStyle: "italic",
                    color: colors.textSecondary,
                  }}
                >
                  {lead.notes || "No notes registered."}
                </Text>
              </View>
            </View>

            <View style={styles.profileActions}>
              <Pressable
                onPress={() => setEditModalVisible(true)}
                style={[
                  styles.editProfileBtn,
                  {
                    borderColor: colors.border,
                    borderWidth: 1,
                    backgroundColor: "transparent",
                  },
                ]}
              >
                <Ionicons name="create-outline" size={16} color={colors.text} />
                <Text
                  style={{
                    color: colors.text,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  Edit Details
                </Text>
              </Pressable>
            </View>
          </View>

          {/* AI Auditing */}
          <View
            style={[
              glassStyle,
              styles.profileCard,
              { backgroundColor: colors.surface },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="sparkles" size={20} color={colors.primary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  marginLeft: 8,
                  color: colors.text,
                }}
              >
                AI CRM Auditor
              </Text>
              <View style={{ flex: 1 }} />
              <Button
                label={aiLoading ? "Auditing..." : "Run Audit"}
                onPress={handleRunAiAudit}
                disabled={aiLoading}
                variant="primary"
                size="sm"
              />
            </View>

            {aiLoading && (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginVertical: 12 }}
              />
            )}

            {aiResult ? (
              <View style={{ gap: 12 }}>
                <View
                  style={[
                    styles.aiScoreRow,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.gradeAvatar,
                      {
                        backgroundColor: `${colors.primary}33`,
                        borderColor: `${colors.primary}4D`,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: colors.primary,
                      }}
                    >
                      {aiResult.grade}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      Lead Score: {aiResult.score}/100
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      {aiResult.summary}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.aiActionBox,
                    { backgroundColor: colors.bg, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      color: colors.primary,
                      marginBottom: 4,
                    }}
                  >
                    Suggested Next Step:
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {aiResult.suggestedAction}
                  </Text>
                </View>

                {aiResult.proposedQuickReply && (
                  <View
                    style={[
                      styles.aiActionBox,
                      {
                        backgroundColor: colors.bg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: colors.accent,
                        marginBottom: 4,
                      }}
                    >
                      Generated Draft Reply:
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        fontStyle: "italic",
                        color: colors.textSecondary,
                      }}
                    >
                      "{aiResult.proposedQuickReply}"
                    </Text>

                    <View
                      style={{ flexDirection: "row", gap: 12, marginTop: 12 }}
                    >
                      <Button
                        label="Send WhatsApp"
                        onPress={() =>
                          throttledSendMessage(
                            "whatsapp",
                            aiResult.proposedQuickReply || "",
                          )
                        }
                        disabled={actionLoading}
                        variant="success"
                        size="sm"
                        style={{ flex: 1 }}
                      />

                      <Button
                        label="Send SMS"
                        onPress={() =>
                          throttledSendMessage(
                            "sms",
                            aiResult.proposedQuickReply || "",
                          )
                        }
                        disabled={actionLoading}
                        variant="primary"
                        size="sm"
                        style={{ flex: 1 }}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontStyle: "italic",
                  textAlign: "center",
                  paddingVertical: 12,
                }}
              >
                Run the AI audit to grade this contact and auto-generate
                follow-up scripts.
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Edit Contact Modal */}
        <BottomDrawer
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          title="Edit Contact Details"
        >
          <View style={{ gap: 16, marginTop: 8 }}>
            <TextInput
              value={formData.name}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, name: val }))
              }
              placeholder="Full Name"
              placeholderTextColor={colors.textMuted}
              style={[glassInputStyle, styles.input]}
            />

            <View style={{ marginBottom: 8 }}>
              <SectionLabel label="Status" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(
                  ["NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"] as const
                ).map((opt) => (
                  <PillButton
                    key={opt}
                    label={opt}
                    selected={formData.status === opt}
                    onPress={() =>
                      setFormData((prev) => ({ ...prev, status: opt }))
                    }
                  />
                ))}
              </View>
            </View>

            <TextInput
              value={formData.email}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, email: val }))
              }
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              style={[glassInputStyle, styles.input]}
            />

            <TextInput
              value={formData.phone}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, phone: val }))
              }
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[glassInputStyle, styles.input]}
            />

            <TextInput
              value={formData.notes}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, notes: val }))
              }
              placeholder="Add notes..."
              placeholderTextColor={colors.textMuted}
              style={[glassInputStyle, styles.input, { height: 60 }]}
            />

            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Button
                label="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                label="Save Changes"
                onPress={throttledUpdate}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </BottomDrawer>

        {/* Alerts */}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deleteHeaderBtn: {
    padding: 4,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 60,
  },
  profileCard: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  leadName: {
    fontWeight: "bold",
    fontSize: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailsBox: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 14,
    gap: 12,
    marginTop: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  notesSection: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  profileActions: {
    flexDirection: "row",
    marginTop: 16,
  },
  editProfileBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  aiScoreRow: {
    flexDirection: "row",
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
  },
  gradeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  aiActionBox: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 12,
  },
  dispatchBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
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
  input: {
    height: 44,
    marginBottom: 12,
    width: "100%",
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusPill: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
