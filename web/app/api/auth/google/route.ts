export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleToken, signToken } from "../../../../../shared/auth";
import { db } from "../../../../../shared/dbClient";
import { users, organizations } from "../../../../../shared/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing idToken" } },
        { status: 400 }
      );
    }

    const googleProfile = await verifyGoogleToken(idToken);
    if (!googleProfile) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid idToken" } },
        { status: 401 }
      );
    }

    const mockUserId = `u_${googleProfile.googleId.replace("g_", "")}`;
    let finalUser = {
      id: mockUserId,
      email: googleProfile.email,
      name: googleProfile.name,
      role: "ADMIN",
      organizationId: null as string | null
    };

    try {
      // Connect and query Turso SQLite
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleProfile.googleId))
        .limit(1)
        .then((r) => r[0]);

      if (existingUser) {
        finalUser = {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name || googleProfile.name,
          role: existingUser.role,
          organizationId: existingUser.organizationId
        };
      } else {
        // Create default organization
        const orgId = `org_${Math.random().toString(36).substring(2, 11)}`;
        await db.insert(organizations).values({
          id: orgId,
          name: `${googleProfile.name}'s Workspace`,
          subscriptionTier: "FREE",
          subscriptionStatus: "ACTIVE",
          createdAt: Date.now()
        });

        // Insert new user
        await db.insert(users).values({
          id: mockUserId,
          email: googleProfile.email,
          name: googleProfile.name,
          googleId: googleProfile.googleId,
          organizationId: orgId,
          role: "ADMIN",
          createdAt: Date.now()
        });

        finalUser.organizationId = orgId;
      }
    } catch (dbError) {
      console.error("SQLite connection error, operating in memory-only fallback mode:", dbError);
    }

    const token = signToken({
      userId: finalUser.id,
      email: finalUser.email,
      name: finalUser.name
    });

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: finalUser
      },
      message: "Authenticated successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
