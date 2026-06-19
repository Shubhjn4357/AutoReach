import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { sendWhatsAppText, sendWhatsAppImage } from "../../../../shared/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid authorization" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { phone, text, imageUrl, caption } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Phone number is required" } },
        { status: 400 }
      );
    }

    let result;
    if (imageUrl) {
      result = await sendWhatsAppImage(phone, imageUrl, caption || "");
    } else {
      if (!text) {
        return NextResponse.json(
          { success: false, error: { code: "BAD_REQUEST", message: "Text content is required" } },
          { status: 400 }
        );
      }
      result = await sendWhatsAppText(phone, text);
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "INTEGRATION_FAILED", message: result.error } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: "WhatsApp message dispatched successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
