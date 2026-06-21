import * as Haptics from "expo-haptics";

/** Light tap — filter chips, icon buttons, nav tabs */
export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Medium tap — primary buttons, card press */
export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/** Heavy tap — FAB, launch campaign, destructive confirm */
export const hapticHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

/** Success — saved, synced, connected */
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

/** Warning — mark lost, reminder toggle off */
export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

/** Error — validation fail */
export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
