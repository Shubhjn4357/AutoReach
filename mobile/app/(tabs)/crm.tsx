import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  updateLocalLead,
  deleteLocalLead,
} from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { calculatePipelineMetrics } from "../../shared/crm";
import { CustomAlert, AlertButton } from "../../components/CustomAlert";
import { Host } from "@expo/ui";

export default function CRMPipelinesScreen() {
  const { colors, glassStyle } = useTheme();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "ALL">("ALL");
  const [refreshing, setRefreshing] = useState(false);

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

  const loadData = async () => {
    const localLeads = await getLocalLeads();
    setLeads(localLeads);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const changeLeadStatus = async (lead: Lead, nextStatus: LeadStatus) => {
    const updated: Lead = {
      ...lead,
      status: nextStatus,
      updatedAt: Date.now(),
    };
    await updateLocalLead(updated);
    await loadData();
    showCustomAlert(
      "Success",
      `Lead "${lead.name}" moved to ${nextStatus}.`,
      "success",
    );
  };

  const handleDelete = async (id: string) => {
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
            await loadData();
          },
        },
      ],
    );
  };

  const filteredLeads =
    filterStatus === "ALL"
      ? leads
      : leads.filter((l) => l.status === filterStatus);

  const metrics = calculatePipelineMetrics(leads);
  const stages: (LeadStatus | "ALL")[] = [
    "ALL",
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "WON",
    "LOST",
  ];

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
            <Text style={[styles.title, { color: colors.text }]}>Pipeline</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Track conversion stages and deal values
            </Text>
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
                Pipeline Value
              </Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                ${metrics.totalValue.toLocaleString()}
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
                Leads Count
              </Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>
                {metrics.activeCount}
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
                Avg Value
              </Text>
              <Text style={[styles.metricValue, { color: colors.accent }]}>
                $
                {Math.round(
                  metrics.activeCount > 0
                    ? metrics.totalValue / metrics.activeCount
                    : 0,
                ).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Horizontal stages filtering row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 48, marginBottom: 20 }}
            contentContainerStyle={styles.stagesRow}
          >
            {stages.map((stage) => {
              const isSelected = filterStatus === stage;
              return (
                <Pressable
                  key={stage}
                  onPress={() => setFilterStatus(stage)}
                  style={[
                    styles.stageBtn,
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
                      color: isSelected ? "#FFFFFF" : colors.textSecondary,
                    }}
                  >
                    {stage}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Columns cards list */}
          <View style={styles.listContainer}>
            {filteredLeads.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No deals in this stage.
              </Text>
            ) : (
              filteredLeads.map((lead) => (
                <View
                  key={lead.id}
                  style={[
                    glassStyle,
                    styles.leadCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.leadCardTop}>
                    <View style={styles.leadCardTopLeft}>
                      <Text style={[styles.leadName, { color: colors.text }]}>
                        {lead.name}
                      </Text>
                      <Text
                        style={[
                          styles.leadEmail,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {lead.email || "No email provided"}
                      </Text>
                    </View>
                    <View style={styles.leadCardTopRight}>
                      <Text
                        style={[styles.leadValue, { color: colors.primary }]}
                      >
                        ${lead.value.toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              lead.status === "WON"
                                ? `${colors.success}1A`
                                : lead.status === "LOST"
                                  ? `${colors.danger}1A`
                                  : `${colors.primary}1A`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {
                              color:
                                lead.status === "WON"
                                  ? colors.success
                                  : lead.status === "LOST"
                                    ? colors.danger
                                    : colors.primary,
                            },
                          ]}
                        >
                          {lead.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Transition actions */}
                  <View
                    style={[
                      styles.actionsContainer,
                      { borderTopColor: `${colors.border}80` },
                    ]}
                  >
                    <View style={styles.leftActions}>
                      {lead.status !== "WON" && (
                        <Pressable
                          onPress={() =>
                            changeLeadStatus(
                              lead,
                              lead.status === "NEW"
                                ? "CONTACTED"
                                : lead.status === "CONTACTED"
                                  ? "QUALIFIED"
                                  : "WON",
                            )
                          }
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
                            Advance Stage ➔
                          </Text>
                        </Pressable>
                      )}
                      {lead.status !== "LOST" && lead.status !== "WON" && (
                        <Pressable
                          onPress={() => changeLeadStatus(lead, "LOST")}
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
                            Mark Lost
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
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
