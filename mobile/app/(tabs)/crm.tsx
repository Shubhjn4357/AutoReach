import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { getLocalLeads, updateLocalLead, deleteLocalLead } from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { calculatePipelineMetrics } from "../../shared/crm";

export default function CRMPipelinesScreen() {
  const { colors, glassStyle } = useTheme();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | "ALL">("ALL");

  const loadData = async () => {
    const localLeads = await getLocalLeads();
    setLeads(localLeads);
  };

  useEffect(() => {
    loadData();
  }, []);

  const changeLeadStatus = async (lead: Lead, nextStatus: LeadStatus) => {
    const updated: Lead = {
      ...lead,
      status: nextStatus,
      updatedAt: Date.now()
    };
    await updateLocalLead(updated);
    await loadData();
    Alert.alert("Success", `Lead "${lead.name}" moved to ${nextStatus}.`);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this lead?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteLocalLead(id);
            await loadData();
          } 
        }
      ]
    );
  };

  const filteredLeads = filterStatus === "ALL" 
    ? leads 
    : leads.filter(l => l.status === filterStatus);

  const metrics = calculatePipelineMetrics(leads);
  const stages: (LeadStatus | "ALL")[] = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"];

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Deal Funnel</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage sales stages and lead values</Text>
        </View>

        {/* Pipeline Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[glassStyle, styles.metricCard]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Funnel</Text>
            <Text style={[styles.metricValue, { color: colors.primary }]}>${metrics.totalValue.toLocaleString()}</Text>
          </View>
          <View style={[glassStyle, styles.metricCard]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Weighted Projected</Text>
            <Text style={[styles.metricValue, { color: colors.accent }]}>${Math.round(metrics.weightedValue).toLocaleString()}</Text>
          </View>
          <View style={[glassStyle, styles.metricCard]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Win Rate</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>{metrics.winRate}%</Text>
          </View>
        </View>

        {/* Stage Filters Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagesRow}>
          {stages.map(stG => {
            const isSelected = filterStatus === stG;
            return (
              <Pressable
                key={stG}
                onPress={() => setFilterStatus(stG)}
                style={[
                  styles.stageBtn,
                  isSelected
                    ? { backgroundColor: `${colors.primary}33`, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
              >
                <Text style={[styles.stageBtnText, isSelected ? { color: colors.primary, fontWeight: "600" } : { color: colors.textSecondary }]}>
                  {stG}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Pipelines List */}
        <View style={styles.listContainer}>
          {filteredLeads.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No leads match this stage filter.</Text>
          ) : (
            filteredLeads.map(lead => (
              <View key={lead.id} style={[glassStyle, styles.leadCard]}>
                <View style={styles.leadCardTop}>
                  <View style={styles.leadCardTopLeft}>
                    <Text style={[styles.leadName, { color: colors.text }]}>{lead.name}</Text>
                    <Text style={[styles.leadEmail, { color: colors.textSecondary }]}>{lead.email || "No email"}</Text>
                  </View>
                  <View style={styles.leadCardTopRight}>
                    <Text style={[styles.leadValue, { color: colors.text }]}>${lead.value.toLocaleString()}</Text>
                    <Text style={[styles.leadValueLabel, { color: colors.textMuted }]}>Valuation</Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View style={styles.statusBadgeRow}>
                  <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}1A` }]}>
                    <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                      {lead.status}
                    </Text>
                  </View>
                </View>

                {/* Quick Pipeline Actions */}
                <View style={[styles.actionsContainer, { borderTopColor: `${colors.border}80` }]}>
                  <View style={styles.leftActions}>
                    {lead.status !== "WON" && (
                      <Pressable
                        onPress={() => changeLeadStatus(lead, lead.status === "NEW" ? "CONTACTED" : lead.status === "CONTACTED" ? "QUALIFIED" : "WON")}
                        style={[styles.actionBtn, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}33` }]}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Advance Stage ➔</Text>
                      </Pressable>
                    )}
                    {lead.status !== "LOST" && lead.status !== "WON" && (
                      <Pressable
                        onPress={() => changeLeadStatus(lead, "LOST")}
                        style={[styles.actionBtn, { backgroundColor: `${colors.danger}1A`, borderColor: `${colors.danger}33` }]}
                      >
                        <Text style={[styles.actionBtnText, { color: colors.danger }]}>Mark Lost</Text>
                      </Pressable>
                    )}
                  </View>
                  
                  <Pressable
                    onPress={() => handleDelete(lead.id)}
                    style={styles.deleteBtn}
                  >
                    <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    paddingVertical: 4,
  },
  stageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  stageBtnText: {
    fontSize: 12,
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
  leadValueLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
  },
  leftActions: {
    flexDirection: "row",
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBtnText: {
    fontSize: 11,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
