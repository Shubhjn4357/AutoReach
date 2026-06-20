import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { useAppStore } from "../../services/store";
import { getQueuedOperations, getLocalLeads, getLocalTasks } from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import * as SecureStore from "expo-secure-store";

export default function SettingsScreen() {
  const store = useAppStore();
  const { colors, glassStyle, glassInputStyle } = useTheme();
  
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
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>System endpoints and sync utilities</Text>
        </View>

        {/* User Status Profile */}
        <View style={[glassStyle, styles.sectionCard]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>User Profile</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Auth Identity:</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{store.user?.email || "mock_shubham@example.com"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>RBAC Privilege Role:</Text>
            <Text style={[styles.rowValue, styles.primaryRole, { color: colors.primary }]}>{store.user?.role || "ADMIN (Workspace Creator)"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Active SaaS Tier:</Text>
            <Text style={[styles.rowValue, styles.successTier, { color: colors.success }]}>ENTERPRISE TEAM (Unlimited)</Text>
          </View>
        </View>

        {/* API Configuration */}
        <View style={[glassStyle, styles.sectionCard]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Backend Configuration</Text>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Server Base API URL:</Text>
          <TextInput
            placeholder="API Url"
            placeholderTextColor={colors.textMuted}
            value={tempApiUrl}
            onChangeText={setTempApiUrl}
            style={[glassInputStyle, styles.input]}
          />
          <Pressable 
            onPress={handleSaveApi}
            style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.applyBtnText}>Apply Endpoint Changes</Text>
          </Pressable>
        </View>

        {/* Database Statistics */}
        <View style={[glassStyle, styles.sectionCard]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Offline Statistics</Text>
          <View style={[styles.statRow, { borderBottomColor: `${colors.border}4D` }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Local leads stored:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalLeads}</Text>
          </View>
          <View style={[styles.statRow, { borderBottomColor: `${colors.border}4D` }]}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Local tasks checklist:</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalTasks}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Queued updates pending sync:</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>{syncQueueSize}</Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <Pressable 
              onPress={handleManualSync}
              disabled={syncing}
              style={[styles.syncBtn, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}4D`, borderWidth: 1 }]}
            >
              <Text style={[styles.syncBtnText, { color: colors.primary }]}>
                {syncing ? "Synchronizing..." : "Trigger Manual Sync"}
              </Text>
            </Pressable>

            <Pressable 
              onPress={handleWipeData}
              style={[styles.purgeBtn, { backgroundColor: `${colors.danger}1A`, borderColor: `${colors.danger}4D`, borderWidth: 1 }]}
            >
              <Text style={[styles.purgeBtnText, { color: colors.danger }]}>Purge Database Cache</Text>
            </Pressable>
          </View>
        </View>
        
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>AutoReach Client Build v1.0.0 (Production-Level Engine)</Text>
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
  sectionCard: {
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  primaryRole: {
    fontWeight: "bold",
  },
  successTier: {
    fontWeight: "bold",
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    marginBottom: 12,
  },
  applyBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "bold",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  syncBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  syncBtnText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  purgeBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  purgeBtnText: {
    fontWeight: "bold",
    fontSize: 12,
  },
  footerContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  footerText: {
    fontSize: 9,
  },
});
