const OPENWA_API_URL = process.env.OPENWA_API_URL || "http://localhost:3002";

export interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppText(phone: string, text: string): Promise<WhatsAppMessageResult> {
  try {
    const formattedPhone = phone.replace(/\D/g, "") + "@c.us";
    const response = await fetch(`${OPENWA_API_URL}/api/sendText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: formattedPhone, content: text })
    });
    if (!response.ok) throw new Error(`OpenWA responded with code ${response.status}`);
    const data = await response.json();
    return { success: true, messageId: data.id || `wa_${Date.now()}` };
  } catch (error: any) {
    console.error("WhatsApp text dispatch failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendWhatsAppImage(phone: string, imageUrl: string, caption: string): Promise<WhatsAppMessageResult> {
  try {
    const formattedPhone = phone.replace(/\D/g, "") + "@c.us";
    const response = await fetch(`${OPENWA_API_URL}/api/sendImage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: formattedPhone, url: imageUrl, caption })
    });
    if (!response.ok) throw new Error(`OpenWA responded with code ${response.status}`);
    const data = await response.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error("WhatsApp image dispatch failed:", error);
    return { success: false, error: error.message };
  }
}
