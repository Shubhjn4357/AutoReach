import React from "react";
import { Tabs } from "expo-router";
import { useTheme } from "../../services/theme";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={{
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        height: 65,
        paddingBottom: 10,
        paddingTop: 10,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      headerShown: false,
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Contacts",
          tabBarIcon: ({ color, size }) => React.createElement(Ionicons, { name: "people-outline", size, color })
        }} 
      />
      <Tabs.Screen 
        name="crm" 
        options={{ 
          title: "CRM",
          tabBarIcon: ({ color, size }) => React.createElement(Ionicons, { name: "funnel-outline", size, color })
        }} 
      />
      <Tabs.Screen 
        name="tasks" 
        options={{ 
          title: "Tasks",
          tabBarIcon: ({ color, size }) => React.createElement(Ionicons, { name: "checkmark-done-outline", size, color })
        }} 
      />
      <Tabs.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
          tabBarIcon: ({ color, size }) => React.createElement(Ionicons, { name: "settings-outline", size, color })
        }} 
      />
    </Tabs>
  );
}
