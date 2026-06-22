import { useEffect, useState, Suspense } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  updateLocalLead,
  deleteLocalLead,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { SearchBar } from "../../components/SearchBar";
import { FilterPillRow } from "../../components/FilterPillRow";
import { LeadCard } from "../../components/LeadCard";
import { BulkActionBar } from "../../components/BulkActionBar";
import { IconButton } from "../../components/IconButton";
import { useDebounce } from "../../hook/useDebounce";
import { APP_CONSTANTS } from "../../constant";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useSync } from "../../hook/useSync";
import { useCampaign } from "../../hook/useCampaign";
import {
  hapticLight,
  hapticMedium,
  hapticWarning,
  hapticHeavy,
  hapticSuccess,
} from "../../services/haptics";

export default function CRMPipelinesScreen() {
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
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <Suspense fallback={
      <View style={{ flex: 1, padding: 16, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    }>
      <CRMPipelinesScreenContent />
    </Suspense>
  );
}

function CRMPipelinesScreenContent() {
  const { colors, glassStyle } = useTheme();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: leads = [], refetch: refetchLeads } = useSuspenseQuery<Lead[]>({
    queryKey: ["leads"],
    queryFn: getLocalLeads,
  });

  const [filterStatus, setFilterStatus] = useState<LeadStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  const {
    refreshing,
    invalidateAll,
    onRefresh,
  } = useSync({
    showCustomAlert,
    refetchLeads,
  });

  const {
    isBulkMode,
    setIsBulkMode,
    selectedLeadIds,
    setSelectedLeadIds,
  } = useCampaign({
    showCustomAlert,
    invalidateAll,
  });

  const handleOnRefresh = () => onRefresh(async () => {});

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

  const handleDelete = async (id: string) => {
    hapticHeavy();
    showCustomAlert(
      "Confirm Delete",
      "Are you sure you want to delete this lead?",
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
      `Are you sure you want to delete ${selectedLeadIds.length} selected leads?`,
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
            showCustomAlert("Success", "Selected leads deleted.", "success");
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
    showCustomAlert("Updated!", `Selected leads moved to ${nextStatus}.`, "success");
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesStage = filterStatus === "ALL" || lead.status === filterStatus;
    const matchesSearch =
      !debouncedSearch ||
      lead.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (lead.phone && lead.phone.includes(debouncedSearch)) ||
      (lead.email && lead.email.toLowerCase().includes(debouncedSearch.toLowerCase()));
    return matchesStage && matchesSearch;
  });

  const stages: (LeadStatus | "ALL")[] = [
    "ALL",
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "WON",
    "LOST",
  ];

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        edges={["top"]}
        style={[styles.container, { backgroundColor: colors.bg }]}
      >
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContainer}
          removeClippedSubviews={Platform.OS === "android"}
          maxToRenderPerBatch={10}
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
            <>
              {/* Header */}
              <View style={[styles.headerContainer, { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.text }]}>{APP_CONSTANTS.crm.title}</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    {APP_CONSTANTS.crm.subtitle}
                  </Text>
                </View>
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
                placeholder="Search leads..."
                style={{ paddingHorizontal: 0, marginBottom: 16 }}
              />

              {/* Horizontal stages filtering row */}
              <FilterPillRow
                options={stages}
                selected={filterStatus}
                onSelect={setFilterStatus}
                style={{ paddingHorizontal: 0, paddingVertical: 4, marginBottom: 16 }}
              />
            </>
          }
          renderItem={({ item: lead }) => {
            const isSelected = selectedLeadIds.includes(lead.id);
            return (
              <View
                key={lead.id}
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
                      onPress={() => handleDelete(lead.id)}
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
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {APP_CONSTANTS.crm.emptyState}
            </Text>
          }
        />
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
    paddingBottom: 100,
  },
  headerContainer: {
    marginBottom: 20,
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
  stagesRow: {
    gap: 8,
    paddingVertical: 4,
  },
  stageBtn: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 24,
  },
  leadCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  leadCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  leadCardTopLeft: {
    flex: 1,
    paddingRight: 12,
  },
  leadName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  leadEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  leadCardTopRight: {
    alignItems: "flex-end",
  },
  leadValue: {
    fontWeight: "bold",
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 9,
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
