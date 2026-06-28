import * as Haptics from "expo-haptics";

/** Light tap — filter chips, icon buttons, nav tabs */
export const hapticLight = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {}
};

/** Medium tap — primary buttons, card press */
export const hapticMedium = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {}
};

/** Heavy tap — FAB, launch campaign, destructive confirm */
export const hapticHeavy = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  } catch {}
};

/** Success — saved, synced, connected */
export const hapticSuccess = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } catch {}
};

/** Warning — mark lost, reminder toggle off */
export const hapticWarning = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {}
};

/** Error — validation fail */
export const hapticError = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  } catch {}
};
