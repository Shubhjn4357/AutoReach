import React, { useEffect, useState, useRef } from "react";
import { Alert, ActivityIndicator, Animated, Easing, Modal } from "react-native";
import { useRouter } from "expo-router";
import { View, Text, ScrollView, TextInput, Pressable, useTheme } from "../../tw/index";
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

export default function LeadsScreen() {
  const router = useRouter();
  const { theme, toggleTheme, colors } = useTheme();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [profileName, setProfileName] = useState("Shubham");

  // Form State
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<LeadStatus>("NEW");

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
    if (!name.trim()) {
      Alert.alert("Error", "Please fill in contact name");
      return;
    }

    const newLead: Lead = {
      id: `lead_${Math.random().toString(36).substring(2, 10)}`,
      userId: "u_dev_user",
      name: name,
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, "")}@example.com`,
      phone: phone.trim() || "+1555019000",
      status: status,
      value: parseInt(value) || 0,
      notes: "Registered locally.",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setLoading(true);
    await createLocalLead(newLead);
    setName("");
    setValue("");
    setEmail("");
    setPhone("");
    setStatus("NEW");
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
    <View className="flex-1 bg-bg">
      {/* 1. Header with Profile, Theme toggle, and Sync status */}
      <View className="bg-surface border-b border-border px-4 py-4 flex-row justify-between items-center rounded-b-2xl shadow-2xl pt-12">
        <Pressable onPress={() => setProfileModalVisible(true)} className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex-center">
            <Text className="text-primary font-bold text-sm">
              {profileName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-text-secondary text-3xs uppercase tracking-wider font-semibold">User Account</Text>
            <Text className="text-white text-base font-bold">{profileName}</Text>
          </View>
        </Pressable>
        
        <View className="flex-row items-center gap-2">
          {/* Sync Badge */}
          <Pressable 
            onPress={handleSync}
            disabled={syncing}
            className="bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-full flex-row items-center gap-1"
          >
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text className="text-primary text-3xs font-bold">
              {syncing ? "..." : `${queueCount}`}
            </Text>
          </Pressable>

          {/* Theme Toggle */}
          <Pressable 
            onPress={toggleTheme}
            className="w-9 h-9 rounded-full bg-surface border border-border flex-center"
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
      <ScrollView className="flex-1 px-4 py-4" contentContainerClassName="pb-24">
        {/* Sync Warn banner */}
        {queueCount > 0 && (
          <View className="bg-warning/10 border border-warning/20 p-3.5 rounded-xl mb-4 flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Ionicons name="warning-outline" size={16} color={colors.warning} />
              <Text className="text-warning text-xs font-semibold">{queueCount} updates waiting to sync</Text>
            </View>
            <Pressable onPress={handleSync}>
              <Text className="text-warning text-xs font-bold underline">Sync</Text>
            </Pressable>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-white text-lg font-bold">My Pipelines</Text>
          <Text className="text-text-secondary text-xs">Tap a contact to view full details and AI audit</Text>
        </View>

        {/* List of Contacts */}
        <View className="gap-3">
          {loading ? (
            <>
              <LeadCardSkeleton />
              <LeadCardSkeleton />
              <LeadCardSkeleton />
            </>
          ) : leads.length === 0 ? (
            <View className="py-12 items-center justify-center">
              <Ionicons name="people-outline" size={48} color={colors.textMuted} className="mb-2" />
              <Text className="text-text-secondary text-sm italic">No contacts registered.</Text>
              <Text className="text-text-muted text-xs mt-1">Tap the + button to add one.</Text>
            </View>
          ) : (
            leads.map((lead) => (
              <Pressable 
                key={lead.id} 
                onPress={() => router.push(`/contact/${lead.id}`)}
                className="bg-card border border-border p-4 rounded-xl flex-row justify-between items-center shadow-md"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-white font-bold text-base mb-1">{lead.name}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="bg-primary/10 text-primary text-3xs px-2 py-0.5 rounded font-bold">
                      {lead.status}
                    </Text>
                    <Text className="text-text-muted text-2xs">{lead.phone}</Text>
                  </View>
                </View>
                
                <View className="items-end gap-1">
                  <Text className="text-primary font-bold text-sm">${lead.value.toLocaleString()}</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      {/* 2. Floating Action Button (FAB) */}
      <View style={{ position: 'absolute', bottom: 20, right: 20 }}>
        <Pressable 
          onPress={openDrawer}
          className="w-14 h-14 rounded-full bg-primary flex-center shadow-2xl"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* 3. Slide-up Form Drawer Modal */}
      {drawerVisible && (
        <Modal transparent visible={drawerVisible} animationType="none">
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            {/* Backdrop */}
            <Pressable 
              onPress={closeDrawer}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Animated.View style={{ flex: 1, backgroundColor: "#000", opacity: fadeAnim }} />
            </Pressable>

            {/* Slide up content */}
            <Animated.View 
              style={{ 
                transform: [{ translateY: slideAnim }],
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderTopColor: colors.border,
                padding: 24,
              }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-lg font-bold">Create New Contact</Text>
                <Pressable onPress={closeDrawer} className="p-1">
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>

              <TextInput
                placeholder="Full Name / Company"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                className="bg-bg border border-border text-white px-3.5 py-2.5 rounded-xl text-sm mb-3"
              />

              <View className="mb-3">
                <TextInput
                  placeholder="Valuation ($)"
                  placeholderTextColor={colors.textMuted}
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                  className="bg-bg border border-border text-white px-3.5 py-2.5 rounded-xl text-sm w-full"
                />
              </View>

              <View className="mb-3">
                <Text className="text-text-secondary text-3xs uppercase tracking-wide font-semibold mb-2 px-1">Status</Text>
                <View className="flex-row gap-2" style={{ flexWrap: "wrap" }}>
                  {(["NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"] as const).map((statusOption) => {
                    const isSelected = status === statusOption;
                    let activeBg = colors.primary;
                    if (statusOption === "WON") activeBg = colors.success;
                    if (statusOption === "LOST") activeBg = colors.danger;
                    if (statusOption === "QUALIFIED") activeBg = colors.primary;
                    if (statusOption === "CONTACTED") activeBg = colors.accent;
                    
                    return (
                      <Pressable
                        key={statusOption}
                        onPress={() => setStatus(statusOption)}
                        className="px-3 py-2 rounded-xl border border-transparent"
                        style={
                          isSelected
                            ? { backgroundColor: activeBg }
                            : { backgroundColor: colors.bg, borderColor: colors.border }
                        }
                      >
                        <Text 
                          className={isSelected ? "text-white text-xs font-bold" : "text-text-secondary text-xs"}
                          style={isSelected ? { color: "#FFFFFF" } : undefined}
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
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                className="bg-bg border border-border text-white px-3.5 py-2.5 rounded-xl text-sm mb-3"
              />

              <TextInput
                placeholder="Phone Number (e.g. +1555123456)"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                className="bg-bg border border-border text-white px-3.5 py-2.5 rounded-xl text-sm mb-5"
              />

              <Pressable 
                onPress={handleCreateLead}
                className="bg-primary py-3.5 rounded-xl items-center shadow-lg"
              >
                <Text className="text-white font-bold text-sm">Save Contact</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Profile Edit Modal */}
      {profileModalVisible && (
        <Modal transparent visible={profileModalVisible} animationType="slide">
          <View className="flex-1 flex-center bg-black/70 px-6">
            <View className="bg-surface border border-border p-6 rounded-2xl w-full">
              <Text className="text-white text-lg font-bold mb-1">Edit Account Profile</Text>
              <Text className="text-text-secondary text-xs mb-4">Set your display name inside the top bar.</Text>

              <TextInput
                placeholder="Profile Name"
                placeholderTextColor={colors.textMuted}
                value={tempProfileName}
                onChangeText={setTempProfileName}
                className="bg-bg border border-border text-white px-3.5 py-2.5 rounded-xl text-sm mb-4"
              />

              <View className="flex-row gap-3">
                <Pressable 
                  onPress={() => setProfileModalVisible(false)}
                  className="bg-border/20 border border-border py-3 rounded-xl flex-1 items-center"
                >
                  <Text className="text-white font-bold text-sm">Cancel</Text>
                </Pressable>
                <Pressable 
                  onPress={handleSaveProfile}
                  className="bg-primary py-3 rounded-xl flex-1 items-center"
                >
                  <Text className="text-white font-bold text-sm">Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
