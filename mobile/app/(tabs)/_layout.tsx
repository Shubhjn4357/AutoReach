import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
} from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "../../services/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticLight } from "../../services/haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_CONFIG = [
  {
    name: "index",
    label: "Leads",
    icon: "people" as const,
    iconOutline: "people-outline" as const,
  },
  {
    name: "crm",
    label: "CRM",
    icon: "funnel" as const,
    iconOutline: "funnel-outline" as const,
  },
  {
    name: "campaigns",
    label: "Reach",
    icon: "megaphone" as const,
    iconOutline: "megaphone-outline" as const,
  },
  {
    name: "settings",
    label: "Settings",
    icon: "settings" as const,
    iconOutline: "settings-outline" as const,
  },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  const paddingHorizontal = 20;
  const barWidth = SCREEN_WIDTH - paddingHorizontal * 2;
  const tabWidth = barWidth / state.routes.length;

  const animationX = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  useEffect(() => {
    Animated.spring(animationX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();

    // Scale up active tab
    state.routes.forEach((_: any, i: number) => {
      Animated.spring(scaleAnims[i], {
        toValue: state.index === i ? 1.15 : 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.tabBarWrapper, { bottom: 16 + insets.bottom }]}>
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: isDark ? colors.card : "#FFFFFF",
            width: barWidth,
            shadowColor: isDark ? "rgba(0,0,0,0.8)" : colors.clayShadowDark,
          },
        ]}
      >
        {/* Clay Active Pill */}
        <Animated.View
          style={[
            styles.activePill,
            {
              width: tabWidth - 16,
              transform: [{ translateX: Animated.add(animationX, 8) }],
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
            },
          ]}
        />

        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const tab = TAB_CONFIG.find((t) => t.name === route.name);

          const onPress = () => {
            hapticLight();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, { width: tabWidth }]}
            >
              <Animated.View
                style={[
                  styles.tabInner,
                  { transform: [{ scale: scaleAnims[index] }] },
                ]}
              >
                <Ionicons
                  name={tab ? (isFocused ? tab.icon : tab.iconOutline) : "ellipse-outline"}
                  size={20}
                  color={isFocused ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? "#FFFFFF" : colors.textSecondary,
                      fontWeight: isFocused ? "700" : "500",
                    },
                  ]}
                >
                  {tab?.label ?? route.name}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Leads" }} />
      <Tabs.Screen name="crm" options={{ title: "CRM" }} />
      <Tabs.Screen name="campaigns" options={{ title: "Campaigns" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",   // centres the inner fixed-width bar
  },
  tabBarContainer: {
    height: 64,
    borderRadius: 32,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  activePill: {
    position: "absolute",
    height: 48,
    borderRadius: 24,
    top: 8,
    left: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
});

