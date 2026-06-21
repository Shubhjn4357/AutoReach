import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  createLocalLead,
  getQueuedOperations,
  logSentMessage,
  getLocalTemplates,
  MessageTemplate,
} from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import { Lead, LeadStatus } from "../../shared/types";
import { LeadCardSkeleton } from "../../components/Skeleton";
import { getSecureItem, saveSecureItem } from "../../services/store";
import { Ionicons } from "@expo/vector-icons";
import { triggerLocalNotification } from "../../services/notifications";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { Host } from "@expo/ui";
import * as Contacts from "expo-contacts";
import * as Linking from "expo-linking";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "../../hook/useDebounce";

interface LeadCreateFormData {
  name: string;
  value: string;
  email: string;
  phone: string;
  status: LeadStatus;
}

export default function LeadsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, colors, glassStyle, glassInputStyle } =
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
    isLoading: leadsLoading,
    refetch: refetchLeads,
  } = useQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLocalLeads,
  });

  const { data: templates = [], refetch: refetchTemplates } = useQuery<
    MessageTemplate[]
  >({
    queryKey: ["templates"],
    queryFn: getLocalTemplates,
  });

  const { data: queueSize = 0, refetch: refetchQueue } = useQuery<number>({
    queryKey: ["queueSize"],
    queryFn: async () => {
      const queue = await getQueuedOperations();
      return queue.length;
    },
  });

  const { data: profileName = "User Account", refetch: refetchProfile } =
    useQuery<string>({
      queryKey: ["profileName"],
      queryFn: async () => {
        const savedName = await getSecureItem("profile_name");
        return savedName || "User Account";
      },
    });

  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Profile Modal State
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [tempProfileName, setTempProfileName] = useState("");

  // Create Lead Form
  const [formData, setFormData] = useState<LeadCreateFormData>({
    name: "",
    value: "",
    email: "",
    phone: "",
    status: "NEW",
  });

  // Drawer Animation States
  const [drawerVisible, setDrawerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Bulk Messaging States
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkTemplateModalVisible, setBulkTemplateModalVisible] =
    useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customBulkBody, setCustomBulkBody] = useState("");
  const [bulkChannel, setBulkChannel] = useState<"whatsapp" | "sms">(
    "whatsapp",
  );
  const [bulkWizardVisible, setBulkWizardVisible] = useState(false);
  const [currentBulkIndex, setCurrentBulkIndex] = useState(0);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["templates"] }),
      queryClient.invalidateQueries({ queryKey: ["queueSize"] }),
      queryClient.invalidateQueries({ queryKey: ["profileName"] }),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchLeads(),
      refetchTemplates(),
      refetchQueue(),
      refetchProfile(),
    ]);
    setRefreshing(false);
  };

  const handleImportDeviceContacts = async () => {
    try {
      showCustomAlert("Syncing Contacts", "Checking permissions...", "info");
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        showCustomAlert(
          "Permission Denied",
          "AutoReach needs contacts permission to sync phone numbers.",
          "error",
        );
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
      });

      if (!data || data.length === 0) {
        showCustomAlert(
          "No Contacts Found",
          "No contacts fetched from your device.",
          "info",
        );
        return;
      }

      // Load current leads to check for duplicates
      const currentLeads = await getLocalLeads();
      const existingPhones = new Set(
        currentLeads
          .map((l) => l.phone?.replace(/[^0-9]/g, ""))
          .filter(Boolean),
      );
      const existingNames = new Set(
        currentLeads.map((l) => l.name.toLowerCase().trim()),
      );

      let importCount = 0;
      for (const contact of data) {
        const name =
          contact.name ||
          [contact.firstName, contact.lastName].filter(Boolean).join(" ");
        if (!name) continue;

        const phone = contact.phoneNumbers?.[0]?.number || null;
        const email = contact.emails?.[0]?.email || null;

        // Skip if no phone number
        if (!phone) continue;

        const cleanPhone = phone.replace(/[^0-9]/g, "");

        // Deduplicate
        if (
          existingPhones.has(cleanPhone) ||
          existingNames.has(name.toLowerCase().trim())
        ) {
          continue;
        }

        const newLead: Lead = {
          id: `contact_${contact.id || Math.random().toString(36).substring(2, 10)}`,
          userId: "u_dev_user",
          name: name,
          email: email,
          phone: phone,
          status: "NEW",
          value: 0,
          notes: "Imported from device contacts.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await createLocalLead(newLead);
        importCount++;
      }

      await invalidateAll();
      showCustomAlert(
        "Sync Completed",
        `Successfully imported ${importCount} new contacts from your device!`,
        "success",
      );
    } catch (err: any) {
      console.warn("Contact import error", err);
      showCustomAlert(
        "Import Error",
        err.message || "Could not fetch device contacts.",
        "error",
      );
    }
  };

  const handleBulkSendNext = async () => {
    const selectedLeads = leads.filter((l) => selectedLeadIds.includes(l.id));
    if (currentBulkIndex >= selectedLeads.length) {
      setBulkWizardVisible(false);
      setIsBulkMode(false);
      setSelectedLeadIds([]);
      showCustomAlert(
        "Campaign Completed",
        "Sequential messaging dispatch finished.",
        "success",
      );
      return;
    }

    const lead = selectedLeads[currentBulkIndex];
    if (!lead.phone) {
      setCurrentBulkIndex((prev) => prev + 1);
      return;
    }

    let messageText = customBulkBody;
    if (selectedTemplateId) {
      const activeTemplate = templates.find((t) => t.id === selectedTemplateId);
      if (activeTemplate) messageText = activeTemplate.body;
    }

    const personalizedMsg = messageText
      .replace(/\[Name\]/gi, lead.name)
      .replace(/\[Value\]/gi, lead.value.toLocaleString());

    const encodedText = encodeURIComponent(personalizedMsg);
    let url = "";
    if (bulkChannel === "whatsapp") {
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
        await logSentMessage(bulkChannel, lead.phone, "BULK_DIRECT_OPEN");
      }
    } catch (err) {
      console.warn("Linking open error", err);
    }

    setCurrentBulkIndex((prev) => prev + 1);
  };

  const handleBulkSkip = () => {
    setCurrentBulkIndex((prev) => prev + 1);
  };

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerVisible(false);
    });
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
      value: parseInt(formData.value) || 0,
      notes: "Registered locally.",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createLocalLead(newLead);
    setFormData({
      name: "",
      value: "",
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

  const handleSync = async () => {
    setSyncing(true);
    const result = await executeSyncCycle();
    setSyncing(false);
    if (result.success) {
      showCustomAlert(
        "Sync Successful",
        `Synced ${result.syncedCount} modifications.`,
        "success",
      );
      await triggerLocalNotification(
        "AutoReach Sync Completed",
        `Successfully synced ${result.syncedCount} offline modifications.`,
      );
    } else {
      showCustomAlert("Sync Failed", "Check your backend connection.", "error");
    }
    await invalidateAll();
  };

  const handleSaveProfile = async () => {
    if (!tempProfileName.trim()) return;
    await saveSecureItem("profile_name", tempProfileName.trim());
    await invalidateAll();
    setProfileModalVisible(false);
  };

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
    <Host style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => {
              setTempProfileName(profileName);
              setProfileModalVisible(true);
            }}
            style={styles.profileBtn}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {profileName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text
                style={{ fontSize: 14, fontWeight: "bold", color: colors.text }}
              >
                {profileName}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                System Agent
              </Text>
            </View>
          </Pressable>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={handleImportDeviceContacts}
              style={styles.iconBtn}
              accessibilityLabel="Sync Device Contacts"
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.primary}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setIsBulkMode(!isBulkMode);
                setSelectedLeadIds([]);
              }}
              style={[
                styles.iconBtn,
                isBulkMode && { backgroundColor: `${colors.primary}33` },
              ]}
              accessibilityLabel="Toggle Bulk Mode"
            >
              <Ionicons
                name={isBulkMode ? "checkbox" : "checkbox-outline"}
                size={20}
                color={isBulkMode ? colors.accent : colors.primary}
              />
            </Pressable>
            <Pressable
              onPress={handleSync}
              disabled={syncing}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: syncing
                    ? `${colors.primary}1A`
                    : "transparent",
                },
              ]}
            >
              <Ionicons
                name="sync"
                size={20}
                color={queueSize > 0 ? colors.warning : colors.primary}
              />
            </Pressable>
            <Pressable onPress={toggleTheme} style={styles.iconBtn}>
              <Ionicons
                name={theme === "dark" ? "sunny-outline" : "moon-outline"}
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search leads by name, email or phone..."
            placeholderTextColor={colors.textMuted}
            style={glassInputStyle}
          />
        </View>

        {/* Filter Stage Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {(
            ["ALL", "NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"] as const
          ).map((stage) => {
            const isSelected = activeStageFilter === stage;
            return (
              <Pressable
                key={stage}
                onPress={() => setActiveStageFilter(stage)}
                style={[
                  styles.filterBtn,
                  isSelected
                    ? { backgroundColor: colors.primary }
                    : {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                      },
                ]}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: isSelected ? "#FFFFFF" : colors.textSecondary,
                  }}
                >
                  {stage}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Lead List Cards */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.leadsListContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {leadsLoading && leads.length === 0 ? (
            <View style={{ gap: 12 }}>
              <LeadCardSkeleton />
              <LeadCardSkeleton />
              <LeadCardSkeleton />
            </View>
          ) : filteredLeads.length === 0 ? (
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
          ) : (
            filteredLeads.map((lead) => {
              const isSelected = selectedLeadIds.includes(lead.id);
              return (
                <Pressable
                  key={lead.id}
                  onPress={() => {
                    if (isBulkMode) {
                      setSelectedLeadIds((prev) =>
                        prev.includes(lead.id)
                          ? prev.filter((id) => id !== lead.id)
                          : [...prev, lead.id],
                      );
                    } else {
                      router.push(`/contact/${lead.id}`);
                    }
                  }}
                  style={[
                    glassStyle,
                    styles.leadCard,
                    { backgroundColor: colors.surface },
                    isBulkMode &&
                      isSelected && {
                        borderColor: colors.primary,
                        borderWidth: 1,
                      },
                  ]}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      width: "100%",
                      alignItems: "center",
                    }}
                  >
                    {isBulkMode && (
                      <View style={{ marginRight: 12 }}>
                        <Ionicons
                          name={isSelected ? "checkbox" : "square-outline"}
                          size={24}
                          color={isSelected ? colors.primary : colors.textMuted}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "bold",
                          color: colors.text,
                        }}
                      >
                        {lead.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginTop: 2,
                        }}
                      >
                        {lead.email || "No email"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "bold",
                          color: colors.primary,
                        }}
                      >
                        ${lead.value.toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              lead.status === "WON"
                                ? `${colors.success}20`
                                : lead.status === "LOST"
                                  ? `${colors.danger}20`
                                  : `${colors.primary}20`,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: "bold",
                            color:
                              lead.status === "WON"
                                ? colors.success
                                : lead.status === "LOST"
                                  ? colors.danger
                                  : colors.primary,
                          }}
                        >
                          {lead.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <Pressable
          onPress={openDrawer}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>

        {/* Create Contact Drawer Modal */}
        {drawerVisible && (
          <Modal transparent visible={drawerVisible} animationType="none">
            <View style={styles.drawerOverlay}>
              <Pressable onPress={closeDrawer} style={StyleSheet.absoluteFill}>
                <Animated.View
                  style={[styles.drawerBackdrop, { opacity: fadeAnim }]}
                />
              </Pressable>

              <Animated.View
                style={[
                  styles.drawerContent,
                  {
                    transform: [{ translateY: slideAnim }],
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
                  <View style={styles.drawerHeader}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        color: colors.text,
                      }}
                    >
                      Create New Contact
                    </Text>
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={closeDrawer} style={styles.iconBtn}>
                      <Ionicons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>

                  <TextInput
                    value={formData.name}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, name: val }))
                    }
                    placeholder="Full Name / Company"
                    placeholderTextColor={colors.textMuted}
                    style={[glassInputStyle, styles.drawerInput]}
                  />

                  <TextInput
                    value={formData.value}
                    onChangeText={(val) =>
                      setFormData((prev) => ({ ...prev, value: val }))
                    }
                    placeholder="Valuation ($)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[glassInputStyle, styles.drawerInput]}
                  />

                  <View style={styles.statusSelectContainer}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: colors.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      Status
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {(
                        [
                          "NEW",
                          "CONTACTED",
                          "QUALIFIED",
                          "LOST",
                          "WON",
                        ] as const
                      ).map((opt) => {
                        const isSel = formData.status === opt;
                        return (
                          <Pressable
                            key={opt}
                            onPress={() =>
                              setFormData((prev) => ({ ...prev, status: opt }))
                            }
                            style={[
                              styles.statusPill,
                              isSel
                                ? { backgroundColor: colors.primary }
                                : {
                                    backgroundColor: colors.bg,
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                  },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: isSel ? "#FFFFFF" : colors.textSecondary,
                              }}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
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

                  <Pressable
                    onPress={handleCreateLead}
                    style={[
                      styles.saveBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      Save Contact
                    </Text>
                  </Pressable>
                </View>
              </Animated.View>
            </View>
          </Modal>
        )}

        {/* Profile Edit Modal */}
        {profileModalVisible && (
          <Modal
            transparent
            visible={profileModalVisible}
            animationType="slide"
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
          </Modal>
        )}

        {/* Bulk Selection Actions Panel */}
        {isBulkMode && (
          <View
            style={[
              glassStyle,
              styles.bulkActionBar,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "bold", color: colors.text }}
              >
                {selectedLeadIds.length} leads selected
              </Text>
              <Pressable
                onPress={() => {
                  if (selectedLeadIds.length === filteredLeads.length) {
                    setSelectedLeadIds([]);
                  } else {
                    setSelectedLeadIds(filteredLeads.map((l) => l.id));
                  }
                }}
                style={styles.bulkTextBtn}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 11,
                    fontWeight: "600",
                  }}
                >
                  {selectedLeadIds.length === filteredLeads.length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => {
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
                }}
                style={[
                  styles.bulkActionBtn,
                  { backgroundColor: colors.success },
                ]}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                <Text style={styles.bulkActionBtnText}>WhatsApp Selected</Text>
              </Pressable>
              <Pressable
                onPress={() => {
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
                }}
                style={[
                  styles.bulkActionBtn,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color="#FFFFFF"
                />
                <Text style={styles.bulkActionBtnText}>SMS Selected</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Bulk Template Select Modal */}
        {bulkTemplateModalVisible && (
          <Modal
            transparent
            visible={bulkTemplateModalVisible}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
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
                  style={{ maxHeight: 180, marginBottom: 16 }}
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
                  placeholder="Type message here. Use [Name] and [Value] to personalize."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[
                    glassInputStyle,
                    {
                      height: 80,
                      textAlignVertical: "top",
                      marginBottom: 16,
                      padding: 10,
                    },
                  ]}
                />

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
                    Start Sequential Dispatch ({selectedLeadIds.length}{" "}
                    recipients)
                  </Text>
                </Pressable>
              </View>
            </View>
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
                    .replace(/\[Value\]/gi, lead.value.toLocaleString());

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
                          onPress={handleBulkSendNext}
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
      </View>
    </Host>
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
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filtersScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  leadsListContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  leadCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    width: "100%",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  drawerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  drawerInput: {
    height: 44,
    marginBottom: 12,
  },
  statusSelectContainer: {
    marginBottom: 16,
  },
  statusPill: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  saveBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderWidth: 1,
    padding: 24,
    borderRadius: 20,
    width: "100%",
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
  bulkActionBar: {
    position: "absolute",
    bottom: 88,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    zIndex: 999,
  },
  bulkActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  bulkActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  bulkTextBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  templateSelectItem: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
});
