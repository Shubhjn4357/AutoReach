import React, { useEffect, useState } from "react";
import { Alert, ActivityIndicator, StyleSheet, View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../services/theme";
import { 
  getLocalTasks, 
  createLocalTask, 
  updateLocalTaskStatus, 
  deleteLocalTask, 
  getLocalLeads 
} from "../../services/db";
import { Task, Lead } from "../../shared/types";

export default function TasksScreen() {
  const { colors, glassStyle, glassInputStyle } = useTheme();
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
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Checklists</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Action items and lead tasks</Text>
          </View>
          
          <Pressable 
            onPress={() => setShowForm(!showForm)}
            style={[styles.addBtn, { backgroundColor: `${colors.primary}1A`, borderColor: `${colors.primary}4D` }]}
          >
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              {showForm ? "Cancel" : "Add Task"}
            </Text>
          </Pressable>
        </View>

        {/* Task Creation Form */}
        {showForm && (
          <View style={[glassStyle, styles.formContainer]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>Create Action Task</Text>
            <TextInput
              placeholder="Task Title (e.g. Call Delta Partners)"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              style={[glassInputStyle, styles.input]}
            />
            <TextInput
              placeholder="Description / Details (optional)"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              style={[glassInputStyle, styles.input]}
            />
            
            <Text style={[styles.assocLabel, { color: colors.textSecondary }]}>Associate with Lead (Optional):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assocRow}>
              <Pressable
                onPress={() => setSelectedLeadId("")}
                style={[
                  styles.assocBtn,
                  selectedLeadId === ""
                    ? { backgroundColor: `${colors.primary}33`, borderColor: colors.primary, borderWidth: 1 }
                    : { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }
                ]}
              >
                <Text style={[styles.assocBtnText, { color: colors.text }]}>No Association</Text>
              </Pressable>
              {leads.map(lead => (
                <Pressable
                  key={lead.id}
                  onPress={() => setSelectedLeadId(lead.id)}
                  style={[
                    styles.assocBtn,
                    selectedLeadId === lead.id
                      ? { backgroundColor: `${colors.primary}33`, borderColor: colors.primary, borderWidth: 1 }
                      : { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }
                  ]}
                >
                  <Text style={[styles.assocBtnText, { color: colors.text }]}>{lead.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable 
              onPress={handleCreateTask}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.saveBtnText}>Save Action Task</Text>
            </Pressable>
          </View>
        )}

        {/* Tasks List */}
        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : tasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No checklist tasks registered. Tap "Add Task" to create one.</Text>
          ) : (
            tasks.map(task => {
              const associatedLead = leads.find(l => l.id === task.leadId);
              const isCompleted = task.status === "COMPLETED";
              return (
                <View key={task.id} style={[glassStyle, styles.taskCard]}>
                  
                  {/* Checkbox Trigger */}
                  <Pressable 
                    onPress={() => toggleTask(task)}
                    style={[
                      styles.checkbox,
                      isCompleted 
                        ? { backgroundColor: colors.success, borderColor: colors.success }
                        : { borderColor: colors.border, backgroundColor: colors.bg }
                    ]}
                  >
                    {isCompleted && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </Pressable>

                  <View style={styles.taskCardContent}>
                    <Text 
                      style={[
                        styles.taskTitle,
                        { color: colors.text },
                        isCompleted && { color: colors.textMuted, textDecorationLine: "line-through" }
                      ]}
                    >
                      {task.title}
                    </Text>
                    {task.description && (
                      <Text style={[styles.taskDesc, { color: colors.textSecondary }]}>{task.description}</Text>
                    )}
                    {associatedLead && (
                      <Text style={[styles.taskTag, { color: colors.primary }]}>🏷 Lead: {associatedLead.name}</Text>
                    )}
                  </View>

                  {/* Delete Trigger */}
                  <Pressable onPress={() => handleDeleteTask(task.id)} style={styles.deleteBtn}>
                    <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              );
            })
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  formContainer: {
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
  },
  assocLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  assocRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 2,
  },
  assocBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  assocBtnText: {
    fontSize: 12,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  listContainer: {
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 32,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },
  taskCardContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  taskDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  taskTag: {
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
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
