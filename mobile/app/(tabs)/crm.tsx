import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { View, Text, ScrollView, Pressable } from "../../tw/index";
import { getLocalLeads, updateLocalLead, deleteLocalLead } from "../../services/db";
import { Lead, LeadStatus } from "../../shared/types";
import { calculatePipelineMetrics } from "../../shared/crm";

export default function CRMPipelinesScreen() {
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
    <ScrollView className="flex-1 bg-bg px-4 py-6">
      <View className="mb-6">
        <Text className="text-white text-2xl font-bold tracking-tight">Deal Funnel</Text>
        <Text className="text-text-secondary text-sm">Manage sales stages and lead values</Text>
      </View>

      {/* Pipeline Summary Cards */}
      <View className="flex-row gap-3 mb-6">
        <View className="bg-card border border-border p-3 rounded-lg flex-1">
          <Text className="text-text-secondary text-2xs">Total Funnel</Text>
          <Text className="text-primary text-base font-bold">${metrics.totalValue.toLocaleString()}</Text>
        </View>
        <View className="bg-card border border-border p-3 rounded-lg flex-1">
          <Text className="text-text-secondary text-2xs">Weighted Projected</Text>
          <Text className="text-accent text-base font-bold">${Math.round(metrics.weightedValue).toLocaleString()}</Text>
        </View>
        <View className="bg-card border border-border p-3 rounded-lg flex-1">
          <Text className="text-text-secondary text-2xs">Win Rate</Text>
          <Text className="text-success text-base font-bold">{metrics.winRate}%</Text>
        </View>
      </View>

      {/* Stage Filters Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-6">
        {stages.map(stG => (
          <Pressable
            key={stG}
            onPress={() => setFilterStatus(stG)}
            className={`px-3 py-1.5 rounded-full border ${
              filterStatus === stG 
                ? "bg-primary/20 border-primary" 
                : "bg-surface border-border"
            }`}
          >
            <Text className={`text-xs ${filterStatus === stG ? "text-primary font-semibold" : "text-text-secondary"}`}>
              {stG}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Pipelines List */}
      <View className="gap-4 mb-10">
        {filteredLeads.length === 0 ? (
          <Text className="text-text-secondary text-sm italic">No leads match this stage filter.</Text>
        ) : (
          filteredLeads.map(lead => (
            <View key={lead.id} className="bg-card border border-border p-4 rounded-xl">
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 pr-4">
                  <Text className="text-white font-bold text-base">{lead.name}</Text>
                  <Text className="text-text-secondary text-xs">{lead.email || "No email"}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-white font-bold text-sm">${lead.value.toLocaleString()}</Text>
                  <Text className="text-text-muted text-3xs">Valuation</Text>
                </View>
              </View>

              {/* Status Badge */}
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="bg-primary/10 text-primary text-2xs px-2 py-1 rounded font-bold">
                  {lead.status}
                </Text>
              </View>

              {/* Quick Pipeline Actions */}
              <View className="flex-row justify-between items-center border-t border-border/50 pt-3">
                <View className="flex-row gap-1.5">
                  {lead.status !== "WON" && (
                    <Pressable
                      onPress={() => changeLeadStatus(lead, lead.status === "NEW" ? "CONTACTED" : lead.status === "CONTACTED" ? "QUALIFIED" : "WON")}
                      className="bg-primary/10 border border-primary/20 px-2.5 py-1 rounded"
                    >
                      <Text className="text-primary text-3xs font-semibold">Advance Stage ➔</Text>
                    </Pressable>
                  )}
                  {lead.status !== "LOST" && lead.status !== "WON" && (
                    <Pressable
                      onPress={() => changeLeadStatus(lead, "LOST")}
                      className="bg-danger/10 border border-danger/20 px-2.5 py-1 rounded"
                    >
                      <Text className="text-danger text-3xs font-semibold">Mark Lost</Text>
                    </Pressable>
                  )}
                </View>
                
                <Pressable
                  onPress={() => handleDelete(lead.id)}
                  className="px-2 py-1"
                >
                  <Text className="text-danger text-3xs font-bold underline">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
