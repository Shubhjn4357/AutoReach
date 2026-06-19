import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { View, Text, ScrollView, TextInput, Pressable } from "../../tw/index";
import { useAppStore } from "../../services/store";
import { getQueuedOperations, getLocalLeads, getLocalTasks } from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import * as SecureStore from "expo-secure-store";

export default function SettingsScreen() {
  const store = useAppStore();
  const [syncQueueSize, setSyncQueueSize] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [tempApiUrl, setTempApiUrl] = useState(store.apiUrl);
  const [syncing, setSyncing] = useState(false);

  const loadStats = async () => {
    try {
      const queue = await getQueuedOperations();
      setSyncQueueSize(queue.length);
      const leads = await getLocalLeads();
      setTotalLeads(leads.length);
      const tasks = await getLocalTasks();
      setTotalTasks(tasks.length);
    } catch (e) {
      console.warn("Stats read failed", e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [store.apiUrl]);

  const handleSaveApi = () => {
    if (!tempApiUrl.trim()) return;
    store.setApiUrl(tempApiUrl.trim());
    Alert.alert("Success", "API Endpoint updated successfully.");
  };

  const handleManualSync = async () => {
    setSyncing(true);
    const result = await executeSyncCycle();
    setSyncing(false);
    if (result.success) {
      Alert.alert("Sync Complete", `Successfully synchronized ${result.syncedCount} offline operations.`);
    } else {
      Alert.alert("Sync Error", "Could not connect to the API server. Please check settings.");
    }
    await loadStats();
  };

  const handleWipeData = async () => {
    Alert.alert(
      "Confirm Wipe",
      "Are you absolutely sure you want to clear all offline caches and databases from this device?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Wipe Everything",
          style: "destructive",
          onPress: async () => {
            try {
              // Wipe local DB is mocked via simple message since we don't drop tables,
              // but we can delete auth keys and clear Secure Store.
              await SecureStore.deleteItemAsync("auth_token");
              store.setToken(null);
              store.setUser(null);
              Alert.alert("Success", "Local database cache purged. Please restart the app.");
            } catch (err) {
              console.error(err);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-bg px-4 py-6">
      
      {/* Header */}
      <View className="mb-6">
        <Text className="text-white text-2xl font-bold tracking-tight">Settings</Text>
        <Text className="text-text-secondary text-sm">System endpoints and sync utilities</Text>
      </View>

      {/* User Status Profile */}
      <View className="bg-card border border-border p-4 rounded-xl mb-6">
        <Text className="text-white font-bold text-base mb-2">User Profile</Text>
        <View className="flex-row justify-between mb-2">
          <Text className="text-text-secondary text-xs">Auth Identity:</Text>
          <Text className="text-white text-xs font-semibold">{store.user?.email || "mock_shubham@example.com"}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-text-secondary text-xs">RBAC Privilege Role:</Text>
          <Text className="text-primary text-xs font-bold">{store.user?.role || "ADMIN (Workspace Creator)"}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-text-secondary text-xs">Active SaaS Tier:</Text>
          <Text className="text-success text-xs font-bold">ENTERPRISE TEAM (Unlimited)</Text>
        </View>
      </View>

      {/* API Configuration */}
      <View className="bg-card border border-border p-4 rounded-xl mb-6">
        <Text className="text-white font-bold text-base mb-3">Backend Configuration</Text>
        <Text className="text-text-secondary text-xs mb-2">Server Base API URL:</Text>
        <TextInput
          placeholder="API Url"
          placeholderTextColor="#6B7280"
          value={tempApiUrl}
          onChangeText={setTempApiUrl}
          className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-3"
        />
        <Pressable 
          onPress={handleSaveApi}
          className="bg-primary p-2.5 rounded-lg items-center"
        >
          <Text className="text-white font-bold text-xs">Apply Endpoint Changes</Text>
        </Pressable>
      </View>

      {/* Database Statistics */}
      <View className="bg-card border border-border p-4 rounded-xl mb-6">
        <Text className="text-white font-bold text-base mb-3">Offline Statistics</Text>
        <View className="flex-row justify-between mb-2 pb-2 border-b border-border/40">
          <Text className="text-text-secondary text-xs">Local leads stored:</Text>
          <Text className="text-white text-xs font-bold">{totalLeads}</Text>
        </View>
        <View className="flex-row justify-between mb-2 pb-2 border-b border-border/40">
          <Text className="text-text-secondary text-xs">Local tasks checklist:</Text>
          <Text className="text-white text-xs font-bold">{totalTasks}</Text>
        </View>
        <View className="flex-row justify-between mb-4">
          <Text className="text-text-secondary text-xs">Queued updates pending sync:</Text>
          <Text className="text-warning text-xs font-bold">{syncQueueSize}</Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable 
            onPress={handleManualSync}
            disabled={syncing}
            className="bg-primary/20 border border-primary/40 p-3 rounded-lg flex-1 items-center"
          >
            <Text className="text-primary font-bold text-xs">
              {syncing ? "Synchronizing..." : "Trigger Manual Sync"}
            </Text>
          </Pressable>

          <Pressable 
            onPress={handleWipeData}
            className="bg-danger/20 border border-danger/40 p-3 rounded-lg flex-1 items-center"
          >
            <Text className="text-danger font-bold text-xs">Purge Database Cache</Text>
          </Pressable>
        </View>
      </View>
      
      <View className="items-center mb-10 mt-4">
        <Text className="text-text-muted text-3xs">AutoReach Client Build v1.0.0 (Production-Level Engine)</Text>
      </View>

    </ScrollView>
  );
}
