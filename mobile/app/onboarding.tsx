import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../services/theme";
import { saveSecureItem } from "../services/store";
import { Ionicons } from "@expo/vector-icons";
import { Host } from "@expo/ui";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    id: "slide_1",
    title: "Lead Pipeline Hub",
    description:
      "Keep track of all your sales pipelines, contact info, and deal valuations in one central hub.",
    icon: "people",
    accentColor: "#5E6BFF",
  },
  {
    id: "slide_2",
    title: "AI Opportunity Auditor",
    description:
      "Scan opportunities, evaluate lead scoring, and generate proactive follow-up replies using on-device models.",
    icon: "sparkles",
    accentColor: "#30D5C8",
  },
  {
    id: "slide_3",
    title: "Offline Sync & Comms",
    description:
      "Work offline seamlessly. Sync leads and dispatch templates via built-in WhatsApp & SMS gateways when online.",
    icon: "sync-circle",
    accentColor: "#22C55E",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, glassStyle } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const index = Math.round(
          event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
        );
        setActiveIndex(index);
      },
    },
  );

  const handleFinish = async () => {
    try {
      await saveSecureItem("onboarding_completed", "true");
      router.replace("/auth");
    } catch (e) {
      console.error("Failed to complete onboarding:", e);
      router.replace("/auth");
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  return (
    <Host style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Background Glow */}
        <View
          style={[
            styles.glowBlob,
            {
              backgroundColor:
                SLIDES[activeIndex]?.accentColor || colors.primary,
              opacity: 0.1,
            },
          ]}
        />

        {/* Top skip link */}
        <View style={styles.topBar}>
          <Text style={[styles.brandText, { color: colors.text }]}>
            AutoReach
          </Text>
          {activeIndex < SLIDES.length - 1 && (
            <Pressable onPress={handleFinish} hitSlop={12}>
              <Text style={[styles.skipText, { color: colors.textMuted }]}>
                Skip
              </Text>
            </Pressable>
          )}
        </View>

        {/* Slide ScrollView */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.scrollContent}
        >
          {SLIDES.map((slide) => (
            <View key={slide.id} style={styles.slideWrapper}>
              <View style={styles.iconContainer}>
                <View
                  style={[
                    styles.iconGlow,
                    { backgroundColor: slide.accentColor + "20" },
                  ]}
                >
                  <Ionicons
                    name={slide.icon}
                    size={80}
                    color={slide.accentColor}
                  />
                </View>
              </View>

              <View style={[styles.contentCard, glassStyle]}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {slide.title}
                </Text>
                <Text
                  style={[styles.description, { color: colors.textSecondary }]}
                >
                  {slide.description}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom controls panel */}
        <View style={styles.bottomBar}>
          {/* Page Dot Indicators */}
          <View style={styles.dotsWrapper}>
            {SLIDES.map((_, idx) => {
              const inputRange = [
                (idx - 1) * SCREEN_WIDTH,
                idx * SCREEN_WIDTH,
                (idx + 1) * SCREEN_WIDTH,
              ];

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 20, 8],
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              const dotColor = scrollX.interpolate({
                inputRange,
                outputRange: [
                  colors.textMuted,
                  SLIDES[activeIndex]?.accentColor || colors.primary,
                  colors.textMuted,
                ],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.dot,
                    {
                      width: dotWidth,
                      opacity,
                      backgroundColor: dotColor,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Primary action CTA button */}
          <Pressable
            onPress={handleNext}
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  SLIDES[activeIndex]?.accentColor || colors.primary,
              },
            ]}
          >
            <Text style={styles.actionButtonText}>
              {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons
              name={
                activeIndex === SLIDES.length - 1
                  ? "checkmark"
                  : "arrow-forward"
              }
              size={16}
              color="#FFFFFF"
              style={styles.actionIcon}
            />
          </Pressable>
        </View>
      </SafeAreaView>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  glowBlob: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    top: SCREEN_HEIGHT * 0.15,
    alignSelf: "center",
  },
  topBar: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    alignItems: "center",
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 40,
  },
  iconContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  iconGlow: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  contentCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dotsWrapper: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionButton: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
  actionIcon: {
    marginLeft: 8,
  },
});
