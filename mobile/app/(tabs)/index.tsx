import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Animated,
  Easing,
  Modal,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../services/theme";
import {
  getLocalLeads,
  createLocalLead,
  getQueuedOperations
} from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import { Lead, LeadStatus } from "../../shared/types";
import { LeadCardSkeleton } from "../../components/Skeleton";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";

interface LeadCreateFormData {
  name: string;
  value: string;
  email: string;
  phone: string;
  status: LeadStatus;
}

export default function LeadsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, colors, glassStyle, glassInputStyle } = useTheme();
  const insets = useSafeAreaInsets();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [profileName, setProfileName] = useState("Shubham");

  // Singular form state structure
  const [formData, setFormData] = useState<LeadCreateFormData>({
    name: "",
    value: "",
    email: "",
    phone: "",
    status: "NEW"
  });

  // Drawer / Modal Animation State
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [tempProfileName, setTempProfileName] = useState("");

  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      const localLeads = await getLocalLeads();
      setLeads(localLeads);
      const queue = await getQueuedOperations();
      setQueueCount(queue.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    async function loadProfile() {
      const saved = await SecureStore.getItemAsync("profile_name");
      if (saved) {
        setProfileName(saved);
        setTempProfileName(saved);
      } else {
        setTempProfileName("Shubham");
      }
    }
    loadProfile();
  }, []);

  const openDrawer = () => {
    setDrawerVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      })
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
      })
    ]).start(() => {
      setDrawerVisible(false);
    });
  };

  const handleCreateLead = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please fill in contact name");
      return;
    }

    const newLead: Lead = {
      id: `lead_${Math.random().toString(36).substring(2, 10)}`,
      userId: "u_dev_user",
      name: formData.name,
      email: formData.email.trim() || `${formData.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: formData.phone.trim() || "+1555019000",
      status: formData.status,
      value: parseInt(formData.value) || 0,
      notes: "Registered locally.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setLoading(true);
    await createLocalLead(newLead);
    setFormData({
      name: "",
      value: "",
      email: "",
      phone: "",
      status: "NEW"
    });
    closeDrawer();
    await loadData();
    Alert.alert("Contact Created", "Saved locally. Sync queued.");
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await executeSyncCycle();
    setSyncing(false);
    if (result.success) {
      Alert.alert("Sync Successful", `Synced ${result.syncedCount} modifications.`);
    } else {
      Alert.alert("Sync Failed", "Check your backend connection.");
    }
    await loadData();
  };

  const handleSaveProfile = async () => {
    if (!tempProfileName.trim()) return;
    setProfileName(tempProfileName);
    await SecureStore.setItemAsync("profile_name", tempProfileName);
    setProfileModalVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* 1. Header with Profile, Theme toggle, and Sync status */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top }]}>
        <Pressable onPress={() => setProfileModalVisible(true)} style={styles.profileBtn}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}4D` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {profileName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={[styles.profileLabel, { color: colors.textSecondary }]}>User Account</Text>
            <Text style={[styles.profileValue, { color: colors.text }]}>{profileName}</Text>
          </View>
        </Pressable>

        <View style={styles.headerRight}>
          {/* Sync Badge */}
          <Pressable
            onPress={handleSync}
            disabled={syncing}
            style={[styles.syncBadge, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}33` }]}
          >
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text style={[styles.syncText, { color: colors.primary }]}>
              {syncing ? "..." : `${queueCount}`}
            </Text>
          </Pressable>

          {/* Theme Toggle */}
          <Pressable
            onPress={toggleTheme}
            style={[styles.themeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons
              name={theme === "dark" ? "sunny-outline" : "moon-outline"}
              size={18}
              color={colors.text}
            />
          </Pressable>
        </View>
      </View>

      {/* Leads List Scroll view */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Sync Warn banner */}
        {queueCount > 0 && (
          <View style={[styles.warnBanner, { backgroundColor: `${colors.warning}1A`, borderColor: `${colors.warning}33` }]}>
            <View style={styles.warnBannerLeft}>
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text style={[styles.warnText, { color: colors.warning }]}>{queueCount} updates waiting to sync</Text>
            </View>
            <Pressable onPress={handleSync}>
              <Text style={[styles.warnLink, { color: colors.warning }]}>Sync</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: colors.text }]}>My Pipelines</Text>
          <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>Tap a contact to view full details and AI audit</Text>
        </View>

        {/* List of Contacts */}
        <View style={styles.leadsList}>
          {loading ? (
            <>
              <LeadCardSkeleton />
              <LeadCardSkeleton />
              <LeadCardSkeleton />
            </>
          ) : leads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts registered.</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Tap the + button to add one.</Text>
            </View>
          ) : (
            leads.map((lead) => (
              <Pressable
                key={lead.id}
                onPress={() => router.push(`/contact/${lead.id}`)}
                style={[glassStyle, styles.leadCard]}
              >
                <View style={styles.leadCardLeft}>
                  <Text style={[styles.leadName, { color: colors.text }]}>{lead.name}</Text>
                  <View style={styles.leadMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}1A` }]}>
                      <Text style={[styles.statusBadgeText, { color: colors.primary }]}>
                        {lead.status}
                      </Text>
                    </View>
                    <Text style={[styles.leadPhone, { color: colors.textMuted }]}>{lead.phone}</Text>
                  </View>
                </View>

                <View style={styles.leadCardRight}>
                  <Text style={[styles.leadValue, { color: colors.primary }]}>${lead.value.toLocaleString()}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* 2. Floating Action Button (FAB) */}
      <View style={styles.fabContainer}>
        <Pressable
          onPress={openDrawer}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 3. Slide-up Form Drawer Modal */}
      {drawerVisible && (
        <Modal transparent visible={drawerVisible} animationType="none">
          <View style={styles.drawerBackdropContainer}>
            {/* Backdrop */}
            <Pressable
              onPress={closeDrawer}
              style={StyleSheet.absoluteFill}
            >
              <Animated.View style={[styles.drawerBackdrop, { opacity: fadeAnim }]} />
            </Pressable>

            {/* Slide up content */}
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
                  <Text style={[styles.drawerTitle, { color: colors.text }]}>Create New Contact</Text>
                  <Pressable onPress={closeDrawer} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </Pressable>
                </View>

                <TextInput
                  placeholder="Full Name / Company"
                  placeholderTextColor={colors.textMuted}
                  value={formData.name}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, name: text }))}
                  style={[glassInputStyle, styles.drawerInput]}
                />

                <TextInput
                  placeholder="Valuation ($)"
                  placeholderTextColor={colors.textMuted}
                  value={formData.value}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, value: text }))}
                  keyboardType="numeric"
                  style={[glassInputStyle, styles.drawerInput]}
                />

                <View style={styles.statusSelectContainer}>
                  <Text style={[styles.statusSelectLabel, { color: colors.textSecondary }]}>Status</Text>
                  <View style={styles.statusPillsRow}>
                    {(["NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"] as const).map((statusOption) => {
                      const isSelected = formData.status === statusOption;
                      let activeBg = colors.primary;
                      if (statusOption === "WON") activeBg = colors.success;
                      if (statusOption === "LOST") activeBg = colors.danger;
                      if (statusOption === "QUALIFIED") activeBg = colors.primary;
                      if (statusOption === "CONTACTED") activeBg = colors.accent;

                      return (
                        <Pressable
                          key={statusOption}
                          onPress={() => setFormData(prev => ({ ...prev, status: statusOption }))}
                          style={[
                            styles.statusPill,
                            isSelected
                              ? { backgroundColor: activeBg }
                              : { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              isSelected ? { color: "#FFFFFF", fontWeight: "bold" } : { color: colors.textSecondary }
                            ]}
                          >
                            {statusOption}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor={colors.textMuted}
                  value={formData.email}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[glassInputStyle, styles.drawerInput]}
                />

                <TextInput
                  placeholder="Phone Number (e.g. +1555123456)"
                  placeholderTextColor={colors.textMuted}
                  value={formData.phone}
                  onChangeText={(text: string) => setFormData(prev => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                  style={[glassInputStyle, styles.drawerInput, styles.lastDrawerInput]}
                />

                <Pressable
                  onPress={handleCreateLead}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.saveBtnText}>Save Contact</Text>
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Profile Edit Modal */}
      {profileModalVisible && (
        <Modal transparent visible={profileModalVisible} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Account Profile</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Set your display name inside the top bar.</Text>

              <TextInput
                placeholder="Profile Name"
                placeholderTextColor={colors.textMuted}
                value={tempProfileName}
                onChangeText={setTempProfileName}
                style={[glassInputStyle, styles.modalInput]}
              />

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setProfileModalVisible(false)}
                  style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveProfile}
                  style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.modalSaveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  profileLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  profileValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncBadge: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  syncText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  themeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  warnBanner: {
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  warnBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  warnLink: {
    fontSize: 12,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  listSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  leadsList: {
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  leadCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  leadCardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  leadName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  leadMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  leadPhone: {
    fontSize: 11,
  },
  leadCardRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  leadValue: {
    fontWeight: "bold",
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  drawerBackdropContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  drawerContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 4,
  },
  drawerInput: {
    marginBottom: 12,
  },
  lastDrawerInput: {
    marginBottom: 20,
  },
  statusSelectContainer: {
    marginBottom: 12,
  },
  statusSelectLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  statusPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontWeight: "bold",
    fontSize: 14,
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});
