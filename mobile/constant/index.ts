export const APP_CONSTANTS = {
  appName: "AutoReach",
  appIcon:"/assets/icon.png",
  appVersion: "AutoReach Client Build v1.0.0 (Production-Level Engine)",
  
  // Tab Headers & Subtitles
  contacts: {
    title: "Contacts",
    subtitle: "AutoReach Pro",
    searchPlaceholder: "Search contacts...",
  },
  crm: {
    title: "Pipeline",
    subtitle: "Track conversion stages and contact status",
    emptyState: "No deals in this stage.",
  },
  campaigns: {
    title: "Campaigns",
    subtitle: "Bulk outreach and pre-configured automations",
  },
  settings: {
    title: "Settings",
    subtitle: "Configure your workspace endpoints and offline caches",
    versionBanner: "AutoReach Client Build v1.0.0 (Production-Level Engine)",
  },
  
  // Biometrics Lock Screen
  lockScreen: {
    title: "AutoReach is Locked",
    subtitle: "Biometric verification is required to access your workspace.",
    buttonText: "Unlock App",
  },
  
  // Alert Status Types
  alerts: {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
  },

  // Onboarding Slides
  onboardingSlides: [
    {
      id: "slide_1",
      title: "Lead Pipeline Hub",
      description:
        "Keep track of all your sales pipelines and contact info in one central hub.",
      icon: "people-outline" as const,
      accentColor: "#6366F1",
    },
    {
      id: "slide_2",
      title: "AI Opportunity Auditor",
      description:
        "Scan opportunities, evaluate lead scoring, and generate proactive follow-up replies using on-device models.",
      icon: "sparkles-outline" as const,
      accentColor: "#EC4899",
    },
    {
      id: "slide_3",
      title: "Offline Sync & Comms",
      description:
        "Work offline seamlessly. Sync leads and dispatch templates via built-in WhatsApp & SMS gateways when online.",
      icon: "sync-outline" as const,
      accentColor: "#10B981",
    },
  ],
};
