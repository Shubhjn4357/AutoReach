export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { analyzeLeadProfile } from "../../../../shared/ai";

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

    const lead = await req.json();

    if (!lead || !lead.name) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Invalid lead profile" } },
        { status: 400 }
      );
    }

    const result = await analyzeLeadProfile(lead);

    return NextResponse.json({
      success: true,
      data: result,
      message: "Lead profile analyzed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
