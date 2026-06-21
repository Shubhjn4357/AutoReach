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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../services/theme";
import { saveSecureItem } from "../services/store";
import { Ionicons } from "@expo/vector-icons";
import { Host } from "@expo/ui";
import {
  hapticLight,
  hapticMedium,
  hapticSuccess,
} from "../services/haptics";

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
    icon: "people-outline",
    accentColor: "#6366F1",
  },
  {
    id: "slide_2",
    title: "AI Opportunity Auditor",
    description:
      "Scan opportunities, evaluate lead scoring, and generate proactive follow-up replies using on-device models.",
    icon: "sparkles-outline",
    accentColor: "#EC4899",
  },
  {
    id: "slide_3",
    title: "Offline Sync & Comms",
    description:
      "Work offline seamlessly. Sync leads and dispatch templates via built-in WhatsApp & SMS gateways when online.",
    icon: "sync-outline",
    accentColor: "#10B981",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, clayCardStyle, glassStyle } = useTheme();
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
        if (index !== activeIndex && index >= 0 && index < SLIDES.length) {
          hapticLight();
          setActiveIndex(index);
        }
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
      hapticMedium();
      scrollViewRef.current?.scrollTo({
        x: (activeIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      hapticSuccess();
      handleFinish();
    }
  };

  // Interpolated soft ambient background tint matching active slide color
  const ambientBgColor = scrollX.interpolate({
    inputRange: SLIDES.map((_, idx) => idx * SCREEN_WIDTH),
    outputRange: SLIDES.map((slide) => slide.accentColor + "0A"),
    extrapolate: "clamp",
  });

  return (
    <Host style={{ flex: 1 }}>
      <Animated.View 
        style={[
          styles.container, 
          { 
            backgroundColor: colors.bg,
          }
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: ambientBgColor }
          ]}
        />

        <SafeAreaView style={{ flex: 1 }}>
          {/* Top Bar with Branding and Skip */}
          <View style={styles.topBar}>
            <View style={styles.logoRow}>
              <Ionicons name="sparkles" size={20} color={SLIDES[activeIndex]?.accentColor || colors.primary} />
              <Text style={[styles.brandText, { color: colors.text }]}>
                AutoReach
              </Text>
            </View>
            {activeIndex < SLIDES.length - 1 && (
              <Pressable 
                onPress={() => { hapticLight(); handleFinish(); }} 
                style={[
                  styles.skipBtn, 
                  { 
                    backgroundColor: colors.surface + "30", 
                    borderColor: colors.border 
                  }
                ]} 
                hitSlop={12}
              >
                <Text style={[styles.skipText, { color: colors.textSecondary }]}>
                  Skip
                </Text>
              </Pressable>
            )}
          </View>

          {/* Scrollable Slide Content */}
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.scrollContent}
          >
            {SLIDES.map((slide) => {
              const currentAccent = slide.accentColor;
              return (
                <View key={slide.id} style={styles.slideWrapper}>
                  {/* Puffy Claymorphic Ambient Icon */}
                  <View style={styles.iconContainer}>
                    <View
                      style={[
                        clayCardStyle,
                        styles.iconGlow,
                        {
                          backgroundColor: colors.surface,
                          borderColor: currentAccent + "20",
                        },
                      ]}
                    >
                      <View style={[styles.iconInnerCircle, { backgroundColor: currentAccent + "12" }]}>
                        <Ionicons
                          name={slide.icon}
                          size={70}
                          color={currentAccent}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Description Card */}
                  <View style={[styles.contentCard, glassStyle, { borderColor: colors.border }]}>
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
              );
            })}
          </ScrollView>

          {/* Bottom Bar: Dots & Next CTA */}
          <View style={styles.bottomBar}>
            {/* Page Dots */}
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
                    SLIDES[idx]?.accentColor || colors.primary,
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

            {/* Claymorphic Pill CTA Button */}
            <Pressable
              onPress={handleNext}
              style={[
                clayCardStyle,
                styles.actionButton,
                {
                  backgroundColor: SLIDES[activeIndex]?.accentColor || colors.primary,
                  borderColor: (SLIDES[activeIndex]?.accentColor || colors.primary) + "40",
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
      </Animated.View>
    </Host>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    height: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  skipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    alignItems: "center",
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 24,
    height: SCREEN_HEIGHT * 0.65,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  iconGlow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    borderWidth: 1.5,
  },
  iconInnerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  contentCard: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  bottomBar: {
    height: 80,
    paddingHorizontal: 24,
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
    padding: 0,
    borderWidth: 1.5,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  actionIcon: {
    marginLeft: 6,
  },
});
