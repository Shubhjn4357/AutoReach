import React, { useEffect, useState } from "react";
import { Alert } from "react-native";
import { View, Text, ScrollView, TextInput, Pressable } from "../../tw/index";
import { 
  getLocalTasks, 
  createLocalTask, 
  updateLocalTaskStatus, 
  deleteLocalTask, 
  getLocalLeads 
} from "../../services/db";
import { Task, Lead } from "../../shared/types";

export default function TasksScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadData = async () => {
    try {
      const localTasks = await getLocalTasks();
      setTasks(localTasks);
      const localLeads = await getLocalLeads();
      setLeads(localLeads);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a task title");
      return;
    }

    const newTask = {
      id: `task_${Math.random().toString(36).substring(2, 10)}`,
      userId: "u_dev_user",
      leadId: selectedLeadId || null,
      title: title.trim(),
      description: description.trim() || null,
      status: "PENDING" as const,
      dueDate: Date.now() + 86400000, // Due tomorrow
      createdAt: Date.now()
    };

    setLoading(true);
    await createLocalTask(newTask);
    setTitle("");
    setDescription("");
    setSelectedLeadId("");
    setShowForm(false);
    await loadData();
    Alert.alert("Success", "Task created locally and queued for synchronization.");
  };

  const toggleTask = async (task: Task) => {
    const nextStatus = task.status === "PENDING" ? "COMPLETED" : "PENDING";
    await updateLocalTaskStatus(task.id, nextStatus);
    await loadData();
  };

  const handleDeleteTask = async (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this checklist task?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            await deleteLocalTask(id);
            await loadData();
          } 
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-bg px-4 py-6">
      
      {/* Header */}
      <View className="flex-row justify-between items-center mb-6">
        <View>
          <Text className="text-white text-2xl font-bold tracking-tight">Checklists</Text>
          <Text className="text-text-secondary text-sm">Action items and lead tasks</Text>
        </View>
        
        <Pressable 
          onPress={() => setShowForm(!showForm)}
          className="bg-primary/20 border border-primary/40 px-3.5 py-1.5 rounded-full"
        >
          <Text className="text-primary text-xs font-semibold">
            {showForm ? "Cancel" : "Add Task"}
          </Text>
        </Pressable>
      </View>

      {/* Task Creation Form */}
      {showForm && (
        <View className="bg-surface border border-border p-4 rounded-xl mb-6">
          <Text className="text-white text-base font-semibold mb-3">Create Action Task</Text>
          <TextInput
            placeholder="Task Title (e.g. Call Delta Partners)"
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
            className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-3"
          />
          <TextInput
            placeholder="Description / Details (optional)"
            placeholderTextColor="#6B7280"
            value={description}
            onChangeText={setDescription}
            className="bg-bg border border-border text-white px-3 py-2 rounded-lg text-sm mb-3"
          />
          
          <Text className="text-text-secondary text-xs mb-2">Associate with Lead (Optional):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 mb-4">
            <Pressable
              onPress={() => setSelectedLeadId("")}
              className={`px-3 py-1.5 rounded-lg border ${
                selectedLeadId === "" ? "bg-primary/20 border-primary" : "bg-bg border-border"
              }`}
            >
              <Text className="text-white text-xs">No Association</Text>
            </Pressable>
            {leads.map(lead => (
              <Pressable
                key={lead.id}
                onPress={() => setSelectedLeadId(lead.id)}
                className={`px-3 py-1.5 rounded-lg border ${
                  selectedLeadId === lead.id ? "bg-primary/20 border-primary" : "bg-bg border-border"
                }`}
              >
                <Text className="text-white text-xs">{lead.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable 
            onPress={handleCreateTask}
            className="bg-primary p-3 rounded-lg items-center"
          >
            <Text className="text-white font-bold text-sm">Save Action Task</Text>
          </Pressable>
        </View>
      )}

      {/* Tasks List */}
      <View className="gap-3 mb-10">
        {loading ? (
          <ActivityIndicator color="#5E6BFF" style={{ marginTop: 20 }} />
        ) : tasks.length === 0 ? (
          <Text className="text-text-secondary text-sm italic">No checklist tasks registered. Tap "Add Task" to create one.</Text>
        ) : (
          tasks.map(task => {
            const associatedLead = leads.find(l => l.id === task.leadId);
            return (
              <View key={task.id} className="bg-card border border-border p-4 rounded-xl flex-row items-center gap-3">
                
                {/* Checkbox Trigger */}
                <Pressable 
                  onPress={() => toggleTask(task)}
                  className={`w-5 h-5 border rounded flex-center items-center justify-center ${
                    task.status === "COMPLETED" ? "bg-success border-success" : "border-border bg-bg"
                  }`}
                >
                  {task.status === "COMPLETED" && (
                    <Text className="text-white text-2xs font-black">✓</Text>
                  )}
                </Pressable>

                <View className="flex-1">
                  <Text className={`text-sm font-semibold ${
                    task.status === "COMPLETED" ? "text-text-muted line-through" : "text-white"
                  }`}>{task.title}</Text>
                  {task.description && (
                    <Text className="text-text-secondary text-2xs mt-0.5">{task.description}</Text>
                  )}
                  {associatedLead && (
                    <Text className="text-primary text-3xs font-bold mt-1">🏷 Lead: {associatedLead.name}</Text>
                  )}
                </View>

                {/* Delete Trigger */}
                <Pressable onPress={() => handleDeleteTask(task.id)} className="p-1">
                  <Text className="text-danger text-2xs font-bold underline">Delete</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
