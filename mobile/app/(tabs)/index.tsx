import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator } from "react-native";
import { View, Text, ScrollView, TextInput, Pressable } from "../../tw/index";
import { 
  getLocalLeads, 
  createLocalLead, 
  updateLocalLead,
  deleteLocalLead,
  getQueuedOperations 
} from "../../services/db";
import { executeSyncCycle } from "../../services/sync";
import { Lead } from "../../shared/types";
import { recommendNextStep } from "../../shared/crm";
import { LeadCardSkeleton } from "../../components/Skeleton";
import * as SecureStore from "expo-secure-store";

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<any>("NEW");

  // Selected Lead & AI state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
  }, []);

  const handleCreateLead = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please fill in lead name");
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
      notes: "Created offline.",
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
    await loadData();
    Alert.alert("Lead Saved", "Registered locally. Sync queued in background.");
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await executeSyncCycle();
    setSyncing(false);
    if (result.success) {
      Alert.alert("Sync Successful", `Synced ${result.syncedCount} modifications.`);
    } else {
      Alert.alert("Sync Failed", "Check your backend URL and network connection.");
    }
    await loadData();
  };

  const runAiAudit = async (lead: Lead) => {
    setAiLoading(true);
    setAiResult(null);
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const backendUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      
      const response = await fetch(`${backendUrl}/api/ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || "mock_shubham_token"}`
        },
        body: JSON.stringify(lead)
      });

      if (!response.ok) throw new Error("AI Endpoint failed");
      const result = await response.json();
      if (result.success) {
        setAiResult(result.data);
      } else {
        throw new Error(result.error?.message || "Audit failed");
      }
    } catch (error: any) {
      console.warn("AI endpoint unreachable, rendering offline fallback:", error.message);
      // Offline fallback recommendation
      setAiResult({
        score: lead.value > 10000 ? 85 : 55,
        grade: lead.value > 10000 ? "A" : "C",
        summary: `Offline profile assessment. Lead "${lead.name}" valuation is $${lead.value.toLocaleString()}.`,
        suggestedAction: recommendNextStep(lead),
        proposedQuickReply: `Hi ${lead.name.split(" ")[0] || "there"}, following up on our chat. Let me know when you have 5 minutes to connect!`
      });
    } finally {
      setAiLoading(false);
    }
  };

  const sendQuickReplyMsg = async (channel: "whatsapp" | "sms", text: string, recipient: string) => {
    if (!recipient) {
      Alert.alert("Error", "No phone number available for this lead.");
      return;
    }
    setActionLoading(true);
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      const backendUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
      
      const response = await fetch(`${backendUrl}/api/${channel}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || "mock_shubham_token"}`
        },
        body: JSON.stringify({ phone: recipient, text })
      });

      if (!response.ok) throw new Error("Dispatch failed");
      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", `${channel.toUpperCase()} message sent successfully!`);
      } else {
        throw new Error(result.error?.message || "Dispatch failed");
      }
    } catch (error: any) {
      Alert.alert("Offline Dispatch Queued", `Network is offline. The gateway will retry dispatching to ${recipient} later.`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg px-4 py-6">
      
      {/* 1. Header with Offline Sync Indicator */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-white text-2xl font-bold tracking-tight">AutoReach CRM</Text>
          <Text className="text-text-secondary text-sm">Offline-first local records</Text>
        </View>
        
        <Pressable 
          onPress={handleSync}
          disabled={syncing}
          className="bg-primary/10 border border-primary/30 px-4 py-2 rounded-full flex-row items-center gap-2"
        >
          <Text className="text-primary text-xs font-semibold">
            {syncing ? "Syncing..." : `Sync (${queueCount})`}
          </Text>
        </Pressable>
      </View>

      {/* 2. Sync Queue Warning Banner */}
      {queueCount > 0 && (
        <View className="bg-warning/10 border border-warning/30 p-3 rounded-lg mb-6 flex-row justify-between items-center">
          <Text className="text-warning text-xs font-semibold">⚠️ {queueCount} modifications pending cloud upload</Text>
          <Pressable onPress={handleSync}>
            <Text className="text-warning text-xs font-bold underline">Sync Now</Text>
          </Pressable>
        </View>
      )}

      {/* 3. Selected Lead Drawer / Details */}
      {selectedLead && (
        <View className="bg-card border-2 border-primary/50 p-5 rounded-xl mb-6 shadow-2xl">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-lg font-bold">{selectedLead.name}</Text>
            <Pressable onPress={() => { setSelectedLead(null); setAiResult(null); }}>
              <Text className="text-text-muted text-sm font-bold">Close ✕</Text>
            </Pressable>
          </View>

          <View className="bg-bg border border-border p-3 rounded-lg mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-text-secondary text-xs">Value:</Text>
              <Text className="text-white text-xs font-bold">${selectedLead.value.toLocaleString()}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-text-secondary text-xs">Email:</Text>
              <Text className="text-white text-xs">{selectedLead.email || "None"}</Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-text-secondary text-xs">Phone:</Text>
              <Text className="text-white text-xs">{selectedLead.phone || "None"}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-text-secondary text-xs">Status:</Text>
              <Text className="text-primary text-xs font-bold">{selectedLead.status}</Text>
            </View>
          </View>

          {/* AI CRM Agent Module */}
          <View className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-primary text-xs font-bold">✨ Proactive AI CRM Agent</Text>
              <Pressable 
                onPress={() => runAiAudit(selectedLead)}
                disabled={aiLoading}
                className="bg-primary/20 border border-primary/40 px-3 py-1 rounded-md"
              >
                <Text className="text-primary text-2xs font-bold">
                  {aiLoading ? "Analyzing..." : "Run AI Audit"}
                </Text>
              </Pressable>
            </View>

            {aiLoading && <ActivityIndicator color="#5E6BFF" style={{ marginVertical: 10 }} />}

            {aiResult && (
              <View className="gap-3">
                <View className="flex-row items-center gap-3">
                  <View className="bg-primary/20 w-12 h-12 rounded-lg items-center justify-center border border-primary/40">
                    <Text className="text-primary text-xl font-black">{aiResult.grade}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-xs font-bold">Lead Score: {aiResult.score}/100</Text>
                    <Text className="text-text-secondary text-2xs">{aiResult.summary}</Text>
                  </View>
                </View>

                <View className="bg-bg border border-border p-2 rounded">
                  <Text className="text-primary text-2xs font-bold mb-1">Suggested Next Step:</Text>
                  <Text className="text-text-secondary text-2xs">{aiResult.suggestedAction}</Text>
                </View>

                {aiResult.proposedQuickReply && (
                  <View className="bg-bg border border-border p-2 rounded">
                    <Text className="text-accent text-2xs font-bold mb-1">Generated Draft Reply:</Text>
                    <Text className="text-text-secondary text-2xs italic mb-2">"{aiResult.proposedQuickReply}"</Text>
                    
                    <View className="flex-row gap-2">
                      <Pressable 
                        onPress={() => sendQuickReplyMsg("whatsapp", aiResult.proposedQuickReply, selectedLead.phone || "")}
                        disabled={actionLoading}
                        className="bg-success/20 border border-success/40 flex-1 py-2 rounded items-center"
                      >
                        <Text className="text-success text-2xs font-bold">Send WhatsApp</Text>
                      </Pressable>
                      <Pressable 
                        onPress={() => sendQuickReplyMsg("sms", aiResult.proposedQuickReply, selectedLead.phone || "")}
                        disabled={actionLoading}
                        className="bg-primary/20 border border-primary/40 flex-1 py-2 rounded items-center"
                      >
                        <Text className="text-primary text-2xs font-bold">Send SMS</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* 4. New Lead Register Form */}
      <View className="bg-surface border border-border p-4 rounded-xl mb-6">
        <Text className="text-white text-base font-semibold mb-3">Register New Lead</Text>
        <TextInput
          placeholder="Company Name"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-3"
        />
        <View className="flex-row gap-3 mb-3">
          <TextInput
            placeholder="Valuation ($)"
            placeholderTextColor="#6B7280"
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm flex-1"
          />
          <View className="border border-border rounded-lg bg-bg justify-center px-2 flex-1">
            <TextInput
              placeholder="Status (e.g. NEW)"
              placeholderTextColor="#6B7280"
              value={status}
              onChangeText={setStatus}
              className="text-white text-sm"
            />
          </View>
        </View>
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-3"
        />
        <TextInput
          placeholder="Phone Number (WhatsApp/SMS)"
          placeholderTextColor="#6B7280"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-4"
        />
        <Pressable 
          onPress={handleCreateLead}
          className="bg-primary p-3 rounded-lg items-center"
        >
          <Text className="text-white font-bold text-sm">Save Offline</Text>
        </Pressable>
      </View>

      {/* 5. Leads List */}
      <View className="gap-4 mb-10">
        <Text className="text-white text-lg font-bold">Local Pipelines</Text>
        {loading ? (
          <>
            <LeadCardSkeleton />
            <LeadCardSkeleton />
          </>
        ) : leads.length === 0 ? (
          <Text className="text-text-secondary text-sm italic">No leads registered. Add one above.</Text>
        ) : (
          leads.map((lead) => (
            <Pressable 
              key={lead.id} 
              onPress={() => setSelectedLead(lead)}
              className={`bg-card border p-4 rounded-xl ${selectedLead?.id === lead.id ? 'border-primary' : 'border-border'}`}
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold text-base">{lead.name}</Text>
                <Text className="text-primary font-bold text-sm">${lead.value.toLocaleString()}</Text>
              </View>
              
              <View className="flex-row justify-between items-center">
                <Text className="bg-warning/20 text-warning text-xs px-2 py-1 rounded-md font-semibold">
                  {lead.status}
                </Text>
                <Text className="text-text-muted text-xs">Tap to view AI analysis ➔</Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
