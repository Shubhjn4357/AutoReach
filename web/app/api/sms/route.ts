export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { sendSMS } from "../../../../shared/sms";

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
    const { phone, text } = body;

    if (!phone || !text) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Phone and text content are required" } },
        { status: 400 }
      );
    }

    const result = await sendSMS(phone, text);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "INTEGRATION_FAILED", message: result.error, gateway: result.gatewayType } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `SMS dispatched successfully via ${result.gatewayType}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
