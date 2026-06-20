import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signToken } from "../../../../../shared/auth";
import { db } from "../../../../../shared/dbClient";
import { users } from "../../../../../shared/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Email and password are required" } },
        { status: 400 }
      );
    }

    let user = null;
    try {
      user = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)
        .then((r) => r[0]);
    } catch (e) {
      console.warn("Database read failed:", e);
    }

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid email or password" } },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name || undefined
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId
        }
      },
      message: "Login successful",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
