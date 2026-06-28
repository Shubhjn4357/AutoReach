// Standalone WhatsApp service — calls AutoReach Next.js API routes, no OpenWA dependency
import { getErrorMessage } from "./api";


export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppText(
  phone: string,
  text: string,
): Promise<WhatsAppMessageResult> {
  try {
    const response = await fetch(`/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { data?: { messageId?: string } };
    return { success: true, messageId: data?.data?.messageId || `wa_${Date.now()}` };
  } catch (error: unknown) {
    console.error("WhatsApp text dispatch failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendWhatsAppImage(
  phone: string,
  imageUrl: string,
  caption: string,
): Promise<WhatsAppMessageResult> {
  try {
    const response = await fetch(`/api/whatsapp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text: caption, imageUrl, caption }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as { data?: { messageId?: string } };
    return { success: true, messageId: data?.data?.messageId };
  } catch (error: unknown) {
    console.error("WhatsApp image dispatch failed:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}

