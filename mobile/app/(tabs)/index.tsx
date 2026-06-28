import React, { useEffect, useState, useRef, Suspense } from "react";
import {
  Modal,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  createLocalLead,
  getLocalTemplates,
  MessageTemplate,
  updateLocalLead,
  deleteLocalLead,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { LeadCardSkeleton } from "../../components/Skeleton";
import { useAppStore } from "../../services/store";
import { APP_CONSTANTS } from "../../constant";
import { Ionicons } from "@expo/vector-icons";

import { useSync } from "../../hook/useSync";
import { useContacts } from "../../hook/useContacts";
import { useCampaign } from "../../hook/useCampaign";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { SearchBar } from "../../components/SearchBar";
import { FilterPillRow } from "../../components/FilterPillRow";
import { LeadCard } from "../../components/LeadCard";
import { BottomDrawer } from "../../components/BottomDrawer";
import { IconButton } from "../../components/IconButton";
import { BulkActionBar } from "../../components/BulkActionBar";
import { Button } from "../../components/Button";
import { PillButton } from "../../components/PillButton";
import { SectionLabel } from "../../components/SectionLabel";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useDebounce } from "../../hook/useDebounce";
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticWarning,
} from "../../services/haptics";

interface LeadCreateFormData {
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
}

export default function LeadsScreen() {
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
      <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: colors.bg }}>
        <LeadCardSkeleton />
        <LeadCardSkeleton />
        <LeadCardSkeleton />
      </View>
    );
  }

  return (
    <Suspense fallback={
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <LeadCardSkeleton />
        <LeadCardSkeleton />
        <LeadCardSkeleton />
      </View>
    }>
      <LeadsScreenContent />
    </Suspense>
  );
}

function LeadsScreenContent() {
  const router = useRouter();
  const store = useAppStore();
  const { theme, toggleTheme, colors, clayStyle, clayInputStyle, clayCardStyle, glassStyle, glassInputStyle } =
    useTheme();
  const insets = useSafeAreaInsets();

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

  const queryClient = useQueryClient();

  // Search & Filter Status
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStageFilter, setActiveStageFilter] = useState<
    LeadStatus | "ALL"
  >("ALL");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: leads = [],
    refetch: refetchLeads,
  } = useSuspenseQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLocalLeads,
  });

  const { data: templates = [], refetch: refetchTemplates } = useSuspenseQuery<
    MessageTemplate[]
  >({
    queryKey: ["templates"],
    queryFn: getLocalTemplates,
  });

  const profileName = store.user?.name || "User Account";

  // Profile Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [tempProfileName, setTempProfileName] = useState("");

  // Create Lead Form
  const [formData, setFormData] = useState<LeadCreateFormData>({
    name: "",
    email: "",
    phone: "",
    status: "NEW",
  });

  // Drawer Animation States
  const [drawerVisible, setDrawerVisible] = useState(false);

  const {
    syncing,
    refreshing,
    queueSize,
    invalidateAll,
    handleSync,
    onRefresh,
  } = useSync({
    showCustomAlert,
    refetchLeads,
  });

  const {
    handleImportDeviceContacts,
  } = useContacts({
    showCustomAlert,
    invalidateAll,
  });

  const {
    isBulkMode,
    setIsBulkMode,
    selectedLeadIds,
    setSelectedLeadIds,
    bulkTemplateModalVisible,
    setBulkTemplateModalVisible,
    selectedTemplateId,
    setSelectedTemplateId,
    customBulkBody,
    setCustomBulkBody,
    bulkChannel,
    setBulkChannel,
    bulkWizardVisible,
    setBulkWizardVisible,
    currentBulkIndex,
    setCurrentBulkIndex,
    campaignImageUri,
    setCampaignImageUri,
    waLocalLinked,
    setWaLocalLinked,
    autoPilotActive,
    setAutoPilotActive,
    isAutoSending,
    isAutoSendingRef,
    handlePickCampaignImage,
    startAutoPilotLoop,
    handleBulkSendNext,
    handleBulkSkip,
    cancelCampaign,
  } = useCampaign({
    showCustomAlert,
    invalidateAll,
  });

  const changeLeadStatus = async (lead: Lead, nextStatus: LeadStatus) => {
    hapticMedium();
    const updated: Lead = {
      ...lead,
      status: nextStatus,
      updatedAt: Date.now(),
    };
    await updateLocalLead(updated);
    await invalidateAll();
    hapticSuccess();
    showCustomAlert(
      "Updated!",
      `${lead.name} moved to ${nextStatus}.`,
      "success",
    );
  };

  const handleDeleteLead = async (id: string) => {
    hapticHeavy();
    showCustomAlert(
      "Confirm Delete",
      "Are you sure you want to delete this contact?",
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteLocalLead(id);
            await invalidateAll();
          },
        },
      ],
    );
  };

  const handleBulkDelete = async () => {
    hapticHeavy();
    showCustomAlert(
      "Confirm Delete",
      `Are you sure you want to delete ${selectedLeadIds.length} selected contacts?`,
      "warning",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            for (const id of selectedLeadIds) {
              await deleteLocalLead(id);
            }
            setSelectedLeadIds([]);
            setIsBulkMode(false);
            await invalidateAll();
            hapticSuccess();
            showCustomAlert("Success", "Selected contacts deleted.", "success");
          },
        },
      ],
    );
  };

  const handleBulkStatusChange = async (nextStatus: LeadStatus) => {
    hapticMedium();
    for (const id of selectedLeadIds) {
      const lead = leads.find((l) => l.id === id);
      if (lead) {
        const updated: Lead = {
          ...lead,
          status: nextStatus,
          updatedAt: Date.now(),
        };
        await updateLocalLead(updated);
      }
    }
    setSelectedLeadIds([]);
    setIsBulkMode(false);
    await invalidateAll();
    hapticSuccess();
    showCustomAlert("Updated!", `Selected contacts moved to ${nextStatus}.`, "success");
  };

  const handleOnRefresh = () => onRefresh(refetchTemplates);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  const handleCreateLead = async () => {
    if (!formData.name.trim()) {
      showCustomAlert("Error", "Please fill in contact name", "error");
      return;
    }

    const newLead: Lead = {
      id: `lead_${Math.random().toString(36).substring(2, 10)}`,
      userId: "u_dev_user",
      name: formData.name.trim(),
      email:
        formData.email.trim() ||
        `${formData.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: formData.phone.trim() || "+1555019000",
      status: formData.status,
      value: 0,
      notes: "Registered locally.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createLeadMutate(newLead);
  };

  const createLeadMutate = async (newLead: Lead) => {
    await createLocalLead(newLead);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "NEW",
    });
    closeDrawer();
    await invalidateAll();
    showCustomAlert(
      "Contact Created",
      "Saved locally. Sync queued.",
      "success",
    );
  };

  const handleSaveProfile = async () => {
    if (!tempProfileName.trim()) return;
    await store.setUser({
      ...(store.user || { id: "u_dev_user", email: "dev@autoreach.com", role: "ADMIN", organizationId: "org_123" }),
      name: tempProfileName.trim()
    });
    setProfileModalVisible(false);
  };
  const stages: (LeadStatus | "ALL")[] = [
    "ALL",
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "WON",
    "LOST",
  ];
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (lead.email &&
        lead.email.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (lead.phone && lead.phone.includes(debouncedSearch));

    const matchesStage =
      activeStageFilter === "ALL" || lead.status === activeStageFilter;

    return matchesSearch && matchesStage;
  });

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        {/* Lead List Cards (Virtualized FlatList with Suspense) */}
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.leadsListContainer}
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleOnRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={{ backgroundColor: colors.bg }}>
              {/* Clay Header */}
              <View style={[styles.header, { paddingHorizontal: 0, paddingBottom: 16, backgroundColor: colors.bg }]}>
                <Pressable
                  onPress={() => {
                    setTempProfileName(profileName);
                    setProfileModalVisible(true);
                  }}
                  style={styles.profileBtn}
                >
                  <View style={[
                    styles.avatar,
                    {
                      backgroundColor: colors.primary,
                      shadowColor: colors.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 6,
                    }
                  ]}>
                    <Text style={styles.avatarText}>
                      {profileName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{ fontSize: 15, fontWeight: "800", color: colors.text, letterSpacing: -0.3 }}
                    >
                      {profileName}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: "500" }}>
                      {APP_CONSTANTS.contacts.subtitle}
                    </Text>
                  </View>
                </Pressable>

                <View style={{ flex: 1 }} />

                <View style={{ flexDirection: "row", gap: 6 }}>
                  <IconButton
                    icon="people-outline"
                    onPress={handleImportDeviceContacts}
                    bgColor={colors.primarySoft}
                    color={colors.primary}
                    accessibilityLabel="Sync Device Contacts"
                  />
                  <IconButton
                    icon={isBulkMode ? "checkbox" : "checkbox-outline"}
                    onPress={() => {
                      setIsBulkMode(!isBulkMode);
                      setSelectedLeadIds([]);
                    }}
                    bgColor={isBulkMode ? colors.primarySoft : colors.accentSoft}
                    color={isBulkMode ? colors.primary : colors.accent}
                    accessibilityLabel="Toggle Bulk Mode"
                  />
                  <IconButton
                    icon="sync"
                    onPress={handleSync}
                    disabled={syncing}
                    bgColor={queueSize > 0 ? colors.warningSoft : colors.primarySoft}
                    color={queueSize > 0 ? colors.warning : colors.primary}
                  />
                  <IconButton
                    icon={theme === "dark" ? "sunny-outline" : "moon-outline"}
                    onPress={toggleTheme}
                    bgColor={colors.accentSoft}
                    color={colors.accent}
                  />
                </View>
              </View>

              {/* CRM Summary Metrics Row */}
              <View style={styles.summaryRow}>
                <View
                  style={[
                    styles.metricCard,
                    glassStyle,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                    Total Contacts
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.primary }]}>
                    {leads.length}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metricCard,
                    glassStyle,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                    Active Leads
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.success }]}>
                    {leads.filter((l) => l.status !== "WON" && l.status !== "LOST").length}
                  </Text>
                </View>
                <View
                  style={[
                    styles.metricCard,
                    glassStyle,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                    Deals Won
                  </Text>
                  <Text style={[styles.metricValue, { color: colors.accent }]}>
                    {leads.filter((l) => l.status === "WON").length}
                  </Text>
                </View>
              </View>

              {/* Clay Search Bar */}
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={APP_CONSTANTS.contacts.searchPlaceholder}
                style={{ paddingHorizontal: 0, marginBottom: 16 }}
              />

              {/* Filter Stage Selector */}
              <FilterPillRow
                options={stages}
                selected={activeStageFilter}
                onSelect={setActiveStageFilter}
                style={{ paddingHorizontal: 0, paddingVertical: 4, marginBottom: 16 }}
              />
            </View>
          }
          renderItem={({ item: lead }) => {
            const isSelected = selectedLeadIds.includes(lead.id);
            return (
              <View
                style={[
                  glassStyle,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderWidth: isSelected ? 2 : 1.5,
                    borderRadius: 22,
                    overflow: "hidden",
                    marginBottom: 12,
                    shadowColor: isSelected ? colors.primary : colors.clayShadowDark,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isSelected ? 0.3 : 0.15,
                    shadowRadius: 14,
                    elevation: isSelected ? 10 : 6,
                  },
                ]}
              >
                <LeadCard
                  lead={lead}
                  isBulkMode={isBulkMode}
                  isSelected={isSelected}
                  onPress={() => {
                    if (isBulkMode) {
                      hapticLight();
                      setSelectedLeadIds((prev) =>
                        prev.includes(lead.id)
                          ? prev.filter((id) => id !== lead.id)
                          : [...prev, lead.id],
                      );
                    } else {
                      hapticMedium();
                      router.push(`/contact/${lead.id}`);
                    }
                  }}
                  style={{
                    borderWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  }}
                />

                {/* Transition actions */}
                {!isBulkMode && (
                  <View
                    style={[
                      styles.actionsContainer,
                      { borderTopColor: `${colors.border}80`, marginHorizontal: 16, marginBottom: 14, paddingTop: 12 },
                    ]}
                  >
                    <View style={styles.leftActions}>
                      {lead.status !== "WON" && (
                        <Pressable
                          onPress={() => {
                            hapticMedium();
                            changeLeadStatus(
                              lead,
                              lead.status === "NEW"
                                ? "CONTACTED"
                                : lead.status === "CONTACTED"
                                  ? "QUALIFIED"
                                  : "WON",
                            );
                          }}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: `${colors.primary}1A`,
                              borderColor: `${colors.primary}33`,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: colors.primary,
                            }}
                          >
                            Next Stage ➔
                          </Text>
                        </Pressable>
                      )}
                      {lead.status !== "LOST" && lead.status !== "WON" && (
                        <Pressable
                          onPress={() => { hapticWarning(); changeLeadStatus(lead, "LOST"); }}
                          style={[
                            styles.actionBtn,
                            {
                              backgroundColor: `${colors.danger}1A`,
                              borderColor: `${colors.danger}33`,
                              borderWidth: 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: colors.danger,
                            }}
                          >
                            Mark Fail
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <View style={{ flex: 1 }} />
                    <Pressable
                      onPress={() => handleDeleteLead(lead.id)}
                      style={styles.deleteBtn}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "bold",
                          textDecorationLine: "underline",
                          color: colors.danger,
                        }}
                      >
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: "center",
                color: colors.textMuted,
                marginTop: 40,
                fontStyle: "italic",
              }}
            >
              No contacts found.
            </Text>
          }
        />

        {/* Clay FAB */}
        <Pressable
          onPress={() => { hapticHeavy(); openDrawer(); }}
          style={[
            styles.fab,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.5,
              shadowRadius: 16,
              elevation: 14,
            },
          ]}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>

        {/* Create Contact Drawer Modal */}
        <BottomDrawer
          visible={drawerVisible}
          onClose={closeDrawer}
          title="Create New Contact"
        >
          <View style={{ gap: 16, marginTop: 8 }}>
            <TextInput
              value={formData.name}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, name: val }))
              }
              placeholder="Full Name / Company"
              placeholderTextColor={colors.textMuted}
              style={[glassInputStyle, styles.drawerInput]}
            />

            <View style={styles.statusSelectContainer}>
              <SectionLabel label="Status" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(
                  [
                    "NEW",
                    "CONTACTED",
                    "QUALIFIED",
                    "LOST",
                    "WON",
                  ] as const
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
              placeholder="Email Address"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              style={[glassInputStyle, styles.drawerInput]}
            />

            <TextInput
              value={formData.phone}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, phone: val }))
              }
              placeholder="Phone Number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={[glassInputStyle, styles.drawerInput]}
            />

            <Button
              label="Save Contact"
              onPress={handleCreateLead}
              variant="primary"
              style={{ marginTop: 8 }}
            />
          </View>
        </BottomDrawer>

        {/* Profile Edit Modal */}
        {profileModalVisible && (
          <Modal
            transparent
            visible={profileModalVisible}
            animationType="slide"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalOverlay}>
                <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: colors.text,
                    marginBottom: 4,
                  }}
                >
                  Edit Account Profile
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginBottom: 16,
                  }}
                >
                  Set your display name inside the top bar.
                </Text>

                <TextInput
                  value={tempProfileName}
                  onChangeText={setTempProfileName}
                  placeholder="Profile Name"
                  placeholderTextColor={colors.textMuted}
                  style={[glassInputStyle, { height: 44, marginBottom: 16 }]}
                />

                <View style={{ flexDirection: "row", gap: 12 }}>
                  <Pressable
                    onPress={() => setProfileModalVisible(false)}
                    style={[
                      styles.modalCancelBtn,
                      {
                        borderColor: colors.border,
                        borderWidth: 1,
                        backgroundColor: "transparent",
                      },
                    ]}
                  >
                    <Text style={{ color: colors.text, fontWeight: "bold" }}>
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveProfile}
                    style={[
                      styles.modalSaveBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "bold" }}>
                      Save
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        )}

        {/* Bulk Selection Actions Panel */}
        <BulkActionBar
          selectedCount={isBulkMode ? selectedLeadIds.length : 0}
          onSelectAllToggle={() => {
            if (selectedLeadIds.length === filteredLeads.length) {
              setSelectedLeadIds([]);
            } else {
              setSelectedLeadIds(filteredLeads.map((l) => l.id));
            }
          }}
          isAllSelected={selectedLeadIds.length === filteredLeads.length}
          actions={[
            {
              label: "WhatsApp Selected",
              icon: "logo-whatsapp",
              onPress: () => {
                if (selectedLeadIds.length === 0) {
                  showCustomAlert(
                    "No Selection",
                    "Please select at least one contact.",
                    "warning",
                  );
                  return;
                }
                setBulkChannel("whatsapp");
                setBulkTemplateModalVisible(true);
              },
              bgColor: colors.success,
            },
            {
              label: "SMS Selected",
              icon: "chatbubble-ellipses-outline",
              onPress: () => {
                if (selectedLeadIds.length === 0) {
                  showCustomAlert(
                    "No Selection",
                    "Please select at least one contact.",
                    "warning",
                  );
                  return;
                }
                setBulkChannel("sms");
                setBulkTemplateModalVisible(true);
              },
              bgColor: colors.primary,
            },
            {
              label: "Mark WON",
              icon: "checkmark-circle-outline",
              onPress: () => handleBulkStatusChange("WON"),
              bgColor: colors.success,
            },
            {
              label: "Mark LOST",
              icon: "close-circle-outline",
              onPress: () => handleBulkStatusChange("LOST"),
              bgColor: colors.warning,
            },
            {
              label: "Delete",
              icon: "trash-outline",
              onPress: handleBulkDelete,
              bgColor: colors.danger,
            },
          ]}
        />

        {/* Bulk Template Select Modal */}
        {bulkTemplateModalVisible && (
          <Modal
            transparent
            visible={bulkTemplateModalVisible}
            animationType="slide"
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <View style={styles.modalOverlay}>
                <View
                  style={[
                    styles.modalCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderWidth: 1,
                      maxHeight: "85%", // prevent screen overflow
                    },
                  ]}
                >
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 16,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "bold",
                          color: colors.text,
                        }}
                      >
                        Select Campaign Template
                      </Text>
                      <View style={{ flex: 1 }} />
                      <Pressable
                        onPress={() => setBulkTemplateModalVisible(false)}
                        style={styles.iconBtn}
                      >
                        <Ionicons name="close" size={24} color={colors.text} />
                      </Pressable>
                    </View>

                    {/* Templates Scroll list */}
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      Pre-configured Templates
                    </Text>
                    <ScrollView
                      style={{ maxHeight: 150, marginBottom: 16 }}
                      nestedScrollEnabled
                    >
                      {templates.map((t) => {
                        const isSel = selectedTemplateId === t.id;
                        return (
                          <Pressable
                            key={t.id}
                            onPress={() => {
                              setSelectedTemplateId(t.id);
                              setCustomBulkBody(""); // Clear custom body if template selected
                            }}
                            style={[
                              styles.templateSelectItem,
                              {
                                borderColor: colors.border,
                                borderWidth: 1,
                                padding: 10,
                                borderRadius: 8,
                                marginBottom: 8,
                              },
                              isSel && {
                                backgroundColor: `${colors.primary}1A`,
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "bold",
                                color: isSel ? colors.primary : colors.text,
                              }}
                            >
                              {t.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textSecondary,
                                marginTop: 4,
                              }}
                              numberOfLines={2}
                            >
                              {t.body}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* Custom Body input */}
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      Or Write Custom Message
                    </Text>
                    <TextInput
                      value={customBulkBody}
                      onChangeText={(val) => {
                        setCustomBulkBody(val);
                        setSelectedTemplateId(""); // Clear selected template if writing custom body
                      }}
                      placeholder="Type message here. Use [Name] to personalize."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      style={[
                        glassInputStyle,
                        {
                          height: 70,
                          textAlignVertical: "top",
                          marginBottom: 16,
                          padding: 10,
                        },
                      ]}
                    />

                    {/* Campaign Image Upload Option */}
                    {bulkChannel === "whatsapp" && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 8 }}>
                          Campaign Image (Optional)
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
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

                    {/* Local Gateway / Auto-Pilot Option */}
                    {bulkChannel === "whatsapp" && (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: waLocalLinked ? colors.successSoft : colors.primarySoft,
                        borderColor: waLocalLinked ? colors.success + "30" : colors.primary + "30",
                        borderWidth: 1.5,
                        marginBottom: 16,
                        gap: 10
                      }}>
                        <Ionicons 
                          name={waLocalLinked ? "logo-whatsapp" : "warning-outline"} 
                          size={18} 
                          color={waLocalLinked ? colors.success : colors.primary} 
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: "bold", color: colors.text }}>
                            Local WhatsApp Linked
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            {waLocalLinked 
                              ? "Auto-Pilot background sending is available." 
                              : "Configure device linking in Settings for Auto-Pilot."}
                          </Text>
                        </View>
                        {waLocalLinked && (
                          <Pressable 
                            onPress={() => { hapticLight(); setAutoPilotActive(!autoPilotActive); }}
                            style={{
                              width: 44,
                              height: 24,
                              borderRadius: 12,
                              backgroundColor: autoPilotActive ? colors.success : colors.border,
                              padding: 2,
                              justifyContent: "center",
                              alignItems: autoPilotActive ? "flex-end" : "flex-start",
                            }}
                          >
                            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" }} />
                          </Pressable>
                        )}
                      </View>
                    )}

                    <Pressable
                      onPress={() => {
                        const selectedLeadsCount = leads.filter((l) =>
                          selectedLeadIds.includes(l.id),
                        ).length;
                        let hasText = customBulkBody.trim().length > 0;
                        if (selectedTemplateId) {
                          const temp = templates.find(
                            (t) => t.id === selectedTemplateId,
                          );
                          if (temp) hasText = true;
                        }
                        if (!hasText) {
                          showCustomAlert(
                            "Empty Message",
                            "Please select a template or write a custom message.",
                            "warning",
                          );
                          return;
                        }
                        setBulkTemplateModalVisible(false);
                        setCurrentBulkIndex(0);
                        setBulkWizardVisible(true);
                        if (autoPilotActive && bulkChannel === "whatsapp" && waLocalLinked) {
                          startAutoPilotLoop(leads, templates);
                        }
                      }}
                      style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "bold",
                          fontSize: 14,
                        }}
                      >
                        Start Campaign ({selectedLeadIds.length} recipients)
                      </Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* Bulk Sequential Send Wizard Modal */}
        {bulkWizardVisible && (
          <Modal transparent visible={bulkWizardVisible} animationType="fade">
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 24,
                  },
                ]}
              >
                {(() => {
                  const selectedLeads = leads.filter((l) =>
                    selectedLeadIds.includes(l.id),
                  );
                  const isDone = currentBulkIndex >= selectedLeads.length;

                  if (isDone) {
                    return (
                      <View
                        style={{ alignItems: "center", paddingVertical: 12 }}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={64}
                          color={colors.success}
                        />
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "bold",
                            color: colors.text,
                            marginTop: 16,
                          }}
                        >
                          Campaign Dispatched!
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.textSecondary,
                            textAlign: "center",
                            marginTop: 8,
                            marginBottom: 20,
                          }}
                        >
                          All selected messages have been processed
                          sequentially.
                        </Text>
                        <Pressable
                          onPress={() => {
                            setBulkWizardVisible(false);
                            setIsBulkMode(false);
                            setSelectedLeadIds([]);
                          }}
                          style={[
                            styles.saveBtn,
                            { backgroundColor: colors.primary, width: "100%" },
                          ]}
                        >
                          <Text
                            style={{ color: "#FFFFFF", fontWeight: "bold" }}
                          >
                            Finish
                          </Text>
                        </Pressable>
                      </View>
                    );
                  }

                  const lead = selectedLeads[currentBulkIndex];
                  let messageText = customBulkBody;
                  if (selectedTemplateId) {
                    const temp = templates.find(
                      (t) => t.id === selectedTemplateId,
                    );
                    if (temp) messageText = temp.body;
                  }
                  const personalizedMsg = messageText
                    .replace(/\[Name\]/gi, lead.name)
                    .replace(/\[Value\]/gi, "");

                  if (autoPilotActive && bulkChannel === "whatsapp" && waLocalLinked && isAutoSending) {
                    return (
                      <View style={{ alignItems: "center", paddingVertical: 20 }}>
                        <ActivityIndicator size="large" color={colors.success} style={{ marginBottom: 16 }} />
                        <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.text, marginBottom: 8 }}>
                          Auto-Pilot Dispatching...
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16, textAlign: "center" }}>
                          Sending to {lead.name} ({lead.phone}) via local gateway
                        </Text>
                        <View style={{ width: "100%", height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginBottom: 24 }}>
                          <View style={{ width: `${((currentBulkIndex + 1) / selectedLeads.length) * 100}%`, height: "100%", backgroundColor: colors.success }} />
                        </View>
                        <Pressable
                          onPress={() => {
                            hapticHeavy();
                            cancelCampaign();
                          }}
                          style={[styles.modalCancelBtn, { borderColor: colors.danger, borderWidth: 1.5, width: "100%", height: 40 }]}
                        >
                          <Text style={{ color: colors.danger, fontWeight: "bold" }}>Cancel / Stop Campaign</Text>
                        </Pressable>
                      </View>
                    );
                  }

                  return (
                    <View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: colors.text,
                          }}
                        >
                          Outreach Wizard ({bulkChannel.toUpperCase()})
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "bold",
                            color: colors.primary,
                          }}
                        >
                          {currentBulkIndex + 1} / {selectedLeads.length}
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View
                        style={{
                          height: 6,
                          backgroundColor: colors.border,
                          borderRadius: 3,
                          marginBottom: 20,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            backgroundColor: colors.primary,
                            width: `${((currentBulkIndex + 1) / selectedLeads.length) * 100}%`,
                          }}
                        />
                      </View>

                      {/* Recipient Card */}
                      <View
                        style={{
                          padding: 12,
                          backgroundColor: colors.bg,
                          borderRadius: 10,
                          borderColor: colors.border,
                          borderWidth: 1,
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{ fontSize: 12, color: colors.textSecondary }}
                        >
                          Recipient Name
                        </Text>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "bold",
                            color: colors.text,
                            marginTop: 2,
                          }}
                        >
                          {lead.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            marginTop: 8,
                          }}
                        >
                          Phone Number
                        </Text>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                            marginTop: 2,
                          }}
                        >
                          {lead.phone || "No phone number available"}
                        </Text>
                      </View>

                      {/* Message Preview */}
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginBottom: 6,
                        }}
                      >
                        Message Preview
                      </Text>
                      <ScrollView
                        style={{
                          height: 100,
                          padding: 10,
                          backgroundColor: colors.bg,
                          borderRadius: 10,
                          borderColor: colors.border,
                          borderWidth: 1,
                          marginBottom: 20,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                            fontStyle: "italic",
                          }}
                        >
                          {personalizedMsg}
                        </Text>
                      </ScrollView>

                      {/* Actions */}
                      <View style={{ gap: 12 }}>
                        <Pressable
                          onPress={() => handleBulkSendNext(leads, templates)}
                          style={[
                            styles.saveBtn,
                            {
                              backgroundColor: colors.primary,
                              flexDirection: "row",
                              gap: 8,
                            },
                          ]}
                        >
                          <Ionicons
                            name="paper-plane"
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text
                            style={{ color: "#FFFFFF", fontWeight: "bold" }}
                          >
                            Launch Intent & Next
                          </Text>
                        </Pressable>

                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable
                            onPress={handleBulkSkip}
                            style={[
                              styles.modalCancelBtn,
                              { borderColor: colors.border, borderWidth: 1 },
                            ]}
                          >
                            <Text
                              style={{ color: colors.text, fontWeight: "bold" }}
                            >
                              Skip Lead
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setBulkWizardVisible(false);
                            }}
                            style={[
                              styles.modalCancelBtn,
                              { borderColor: colors.danger, borderWidth: 1 },
                            ]}
                          >
                            <Text
                              style={{
                                color: colors.danger,
                                fontWeight: "bold",
                              }}
                            >
                              Abort Batch
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>
            </View>
          </Modal>
        )}

        {/* Custom Alerts */}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  iconBtn: {
    padding: 9,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersScroll: {
    paddingVertical: 8,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16
  },
  filterBtn: {
    paddingHorizontal: 18,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  leadsListContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  leadCard: {
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 0,
    borderRadius: 22,
    width: "100%",
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  cardAccent: {
    width: 5,
    height: "65%",
    borderRadius: 3,
    marginLeft: 12,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 116,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  drawerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  drawerBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawerContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1.5,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  drawerInput: {
    marginBottom: 12,
  },
  statusSelectContainer: {
    marginBottom: 16,
  },
  statusPill: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    height: 52,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderWidth: 1.5,
    padding: 24,
    borderRadius: 28,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bulkActionBar: {
    position: "absolute",
    bottom: 96,
    left: 16,
    right: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 16,
    elevation: 12,
    zIndex: 999,
  },
  bulkActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bulkActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  bulkTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  templateSelectItem: {
    borderWidth: 1.5,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
  },
  metricLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  leftActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    paddingHorizontal: 8,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
