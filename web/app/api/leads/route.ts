export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { leadsInMemoryDb } from "../inMemoryDb";
import { db } from "../../../../shared/dbClient";
import { leads } from "../../../../shared/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
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

    let userLeads;
    try {
      userLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.userId, decoded.userId));
    } catch (dbError) {
      console.error("SQLite query failed, falling back to in-memory store:", dbError);
      userLeads = Array.from(leadsInMemoryDb.values()).filter(
        (lead) => lead.userId === decoded.userId
      );
    }

    return NextResponse.json({
      success: true,
      data: userLeads,
      message: `Retrieved ${userLeads.length} leads`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

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
    const { name, email, phone, status, value, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Name is required" } },
        { status: 400 }
      );
    }

    const newLeadId = `lead_${Math.random().toString(36).substring(2, 11)}`;
    const nowTimestamp = Date.now();
    const newLead = {
      id: newLeadId,
      userId: decoded.userId,
      name,
      email: email || null,
      phone: phone || null,
      status: status || "NEW",
      value: value || 0,
      notes: notes || null,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp
    };

    try {
      await db.insert(leads).values({
        id: newLeadId,
        userId: decoded.userId,
        name,
        email: email || null,
        phone: phone || null,
        status: status || "NEW",
        value: Number(value) || 0,
        notes: notes || null,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp
      });
    } catch (dbError) {
      console.error("SQLite insert failed, saving to in-memory store:", dbError);
      leadsInMemoryDb.set(newLeadId, {
        ...newLead,
        createdAt: nowTimestamp,
        updatedAt: nowTimestamp
      });
    }

    return NextResponse.json({
      success: true,
      data: newLead,
      message: "Lead created successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
