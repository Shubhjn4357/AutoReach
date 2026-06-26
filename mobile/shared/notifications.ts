import { type JsonValue, getErrorMessage } from "./api";

export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, JsonValue>;
  sound?: "default" | null;
}

export interface PushResult {
  success: boolean;
  status?: string;
  id?: string;
  error?: string;
}

export async function sendPushNotification(
  payload: PushPayload,
): Promise<PushResult> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ sound: "default", ...payload }),
    });
    if (!response.ok)
      throw new Error(`Expo responded with status: ${response.status}`);
    const resData = await response.json() as { data?: { status?: string; id?: string; message?: string } };
    const ticket = resData.data;
    if (ticket && ticket.status === "ok") {
      return { success: true, status: ticket.status, id: ticket.id };
    }
    return {
      success: false,
      status: ticket?.status || "error",
      error: ticket?.message,
    };
  } catch (error: unknown) {
    console.error("Expo push failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
