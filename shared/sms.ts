import { getErrorMessage } from "./api";

export interface SMSMessageResult {
  success: boolean;
  messageId?: string;
  gatewayType: "ANDROID_GATEWAY" | "TWILIO";
  error?: string;
}

export async function sendSMS(
  phone: string,
  text: string,
): Promise<SMSMessageResult> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString(
        "base64",
      );
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
          },
          body: new URLSearchParams({
            To: phone,
            From: twilioFrom,
            Body: text,
          }),
        },
      );
      if (!response.ok)
        throw new Error(`Twilio responded with code: ${response.status}`);
      const data = await response.json() as { sid: string };
      return { success: true, messageId: data.sid, gatewayType: "TWILIO" };
    } catch (error: unknown) {
      console.error("Twilio SMS failed:", error);
      return { success: false, gatewayType: "TWILIO", error: getErrorMessage(error) };
    }
  }

  try {
    const androidGatewayPushToken = process.env.ANDROID_GATEWAY_PUSH_TOKEN;
    if (!androidGatewayPushToken)
      throw new Error("No SMS credentials configured.");
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: androidGatewayPushToken,
        title: "GATEWAY_SMS_TRIGGER",
        body: text,
        data: { action: "SEND_SMS", recipient: phone, content: text },
      }),
    });
    if (!response.ok)
      throw new Error(`Gateway push responded with status ${response.status}`);
    return {
      success: true,
      messageId: `gw_${Date.now()}`,
      gatewayType: "ANDROID_GATEWAY",
    };
  } catch (error: unknown) {
    console.error("SMS Gateway trigger failed:", error);
    return {
      success: false,
      gatewayType: "ANDROID_GATEWAY",
      error: getErrorMessage(error),
    };
  }
}
