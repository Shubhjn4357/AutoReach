import React, { useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "../../services/theme";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingHorizontal = 24;
  const barWidth = SCREEN_WIDTH - paddingHorizontal * 2;
  const tabWidth = barWidth / state.routes.length;

  const animationX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animationX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      tension: 68,
      friction: 12,
    }).start();
  }, [state.index]);

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          bottom: 20 + insets.bottom,
          left: paddingHorizontal,
          right: paddingHorizontal,
          width: barWidth,
        },
      ]}
    >
      {/* Sliding Active Pill Indicator */}
      <Animated.View
        style={[
          styles.slidingPill,
          {
            width: tabWidth - 12,
            transform: [{ translateX: Animated.add(animationX, 6) }],
            backgroundColor: `${colors.primary}1A`, // Subtle active background color
            borderColor: colors.primary,
            borderWidth: 1,
          },
        ]}
      />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: keyof typeof Ionicons.glyphMap = "people-outline";
        if (route.name === "index") {
          iconName = isFocused ? "people" : "people-outline";
        } else if (route.name === "crm") {
          iconName = isFocused ? "funnel" : "funnel-outline";
        } else if (route.name === "campaigns") {
          iconName = isFocused ? "megaphone" : "megaphone-outline";
        } else if (route.name === "settings") {
          iconName = isFocused ? "settings" : "settings-outline";
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <Ionicons
              name={iconName}
              size={20}
              color={isFocused ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        );
      })}
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
      <Tabs.Screen
        name="index"
        options={{
          title: "Contacts",
        }}
      />
      <Tabs.Screen
        name="crm"
        options={{
          title: "CRM",
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "Campaigns",
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    height: 56,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
  },
  slidingPill: {
    position: "absolute",
    height: 40,
    borderRadius: 20,
    top: 7,
    left: 0,
  },
  tabItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
});
