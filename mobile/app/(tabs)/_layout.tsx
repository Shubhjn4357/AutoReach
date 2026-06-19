import React from "react";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: "#111111",
        borderTopColor: "#2A2A2A",
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: "#5E6BFF",
      tabBarInactiveTintColor: "#6B7280",
      headerStyle: {
        backgroundColor: "#111111",
        borderBottomColor: "#2A2A2A",
      },
      headerTintColor: "#FFFFFF",
    }}>
      <Tabs.Screen name="index" options={{ title: "Leads", headerTitle: "Leads Overview" }} />
      <Tabs.Screen name="crm" options={{ title: "CRM", headerTitle: "Deal Funnel" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", headerTitle: "Checklists" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", headerTitle: "Settings" }} />
    </Tabs>
  );
}
