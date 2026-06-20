import { NextRequest, NextResponse } from "next/server";
import { hashPassword, signToken } from "../../../../../shared/auth";
import { db } from "../../../../../shared/dbClient";
import { users, organizations } from "../../../../../shared/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Email, password, and name are required" } },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser = null;
    try {
      existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)
        .then((r) => r[0]);
    } catch (e) {
      console.warn("Database read failed, falling back:", e);
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: "CONFLICT", message: "User with this email already exists" } },
        { status: 409 }
      );
    }

    const userId = `u_${Math.random().toString(36).substring(2, 11)}`;
    const orgId = `org_${Math.random().toString(36).substring(2, 11)}`;
    const passwordHash = hashPassword(password);

    try {
      // Create organization
      await db.insert(organizations).values({
        id: orgId,
        name: `${name}'s Workspace`,
        subscriptionTier: "FREE",
        subscriptionStatus: "ACTIVE",
        createdAt: Date.now()
      });

      // Insert new user
      await db.insert(users).values({
        id: userId,
        email: email.toLowerCase(),
        name,
        passwordHash,
        organizationId: orgId,
        role: "ADMIN",
        createdAt: Date.now()
      });
    } catch (dbError) {
      console.error("Database user insertion failed:", dbError);
      return NextResponse.json(
        { success: false, error: { code: "DATABASE_ERROR", message: "Could not complete registration in DB" } },
        { status: 500 }
      );
    }

    const token = signToken({
      userId,
      email: email.toLowerCase(),
      name
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email: email.toLowerCase(),
          name,
          role: "ADMIN",
          organizationId: orgId
        }
      },
      message: "Registered successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
