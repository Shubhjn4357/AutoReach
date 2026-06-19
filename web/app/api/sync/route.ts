import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { SyncBatchRequest, SyncBatchResponse } from "../../../../shared/types";
import { leadsInMemoryDb, tasksInMemoryDb } from "../inMemoryDb";
import { db } from "../../../../shared/dbClient";
import { leads, tasks } from "../../../../shared/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing Authorization header" } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } },
        { status: 401 }
      );
    }

    const body = (await req.json()) as SyncBatchRequest;
    const { operations } = body;

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing operations" } },
        { status: 400 }
      );
    }

    const syncedIds: string[] = [];
    const errors: { recordId: string; error: string }[] = [];

    for (const op of operations) {
      try {
        const payload = typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;
        
        // 1. Fallback to in-memory store
        const targetDb = op.table === "leads" ? leadsInMemoryDb : tasksInMemoryDb;
        if (op.operation === "CREATE" || op.operation === "UPDATE") {
          targetDb.set(op.recordId, {
            ...targetDb.get(op.recordId),
            ...payload,
            userId: decoded.userId,
            updatedAt: Date.now()
          });
        } else if (op.operation === "DELETE") {
          targetDb.delete(op.recordId);
        }

        // 2. Turso SQLite Sync with Drizzle
        try {
          if (op.table === "leads") {
            if (op.operation === "CREATE" || op.operation === "UPDATE") {
              const createdAtVal = payload.createdAt ? (typeof payload.createdAt === "number" ? payload.createdAt : new Date(payload.createdAt).getTime()) : Date.now();
              const updatedAtVal = payload.updatedAt ? (typeof payload.updatedAt === "number" ? payload.updatedAt : new Date(payload.updatedAt).getTime()) : Date.now();

              await db.insert(leads).values({
                id: op.recordId,
                userId: decoded.userId,
                name: payload.name || "Unnamed Lead",
                email: payload.email || null,
                phone: payload.phone || null,
                status: payload.status || "NEW",
                value: Number(payload.value) || 0,
                notes: payload.notes || null,
                createdAt: createdAtVal,
                updatedAt: updatedAtVal
              }).onConflictDoUpdate({
                target: leads.id,
                set: {
                  name: payload.name || "Unnamed Lead",
                  email: payload.email || null,
                  phone: payload.phone || null,
                  status: payload.status || "NEW",
                  value: Number(payload.value) || 0,
                  notes: payload.notes || null,
                  updatedAt: updatedAtVal
                }
              });
            } else if (op.operation === "DELETE") {
              await db.delete(leads).where(eq(leads.id, op.recordId));
            }
          } else if (op.table === "tasks") {
            if (op.operation === "CREATE" || op.operation === "UPDATE") {
              const createdAtVal = payload.createdAt ? (typeof payload.createdAt === "number" ? payload.createdAt : new Date(payload.createdAt).getTime()) : Date.now();
              const resolvedDueDate = payload.dueDate ? (typeof payload.dueDate === "number" ? payload.dueDate : new Date(payload.dueDate).getTime()) : null;

              await db.insert(tasks).values({
                id: op.recordId,
                userId: decoded.userId,
                leadId: payload.leadId || null,
                title: payload.title || "Unnamed Task",
                description: payload.description || null,
                status: payload.status || "PENDING",
                dueDate: resolvedDueDate,
                createdAt: createdAtVal
              }).onConflictDoUpdate({
                target: tasks.id,
                set: {
                  leadId: payload.leadId || null,
                  title: payload.title || "Unnamed Task",
                  description: payload.description || null,
                  status: payload.status || "PENDING",
                  dueDate: resolvedDueDate
                }
              });
            } else if (op.operation === "DELETE") {
              await db.delete(tasks).where(eq(tasks.id, op.recordId));
            }
          }
        } catch (dbErr: any) {
          console.warn(`SQLite write failed for ${op.table} [${op.recordId}]:`, dbErr.message);
        }

        syncedIds.push(op.recordId);
      } catch (err: any) {
        errors.push({ recordId: op.recordId, error: err.message });
      }
    }

    const responsePayload: SyncBatchResponse = {
      success: errors.length === 0,
      syncedIds,
      ...(errors.length > 0 && { errors })
    };

    return NextResponse.json({
      success: true,
      data: responsePayload,
      message: `Processed ${syncedIds.length} operations`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allLeads = await db.select().from(leads);
    const allTasks = await db.select().from(tasks);
    return NextResponse.json({
      success: true,
      data: { leads: allLeads, tasks: allTasks },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        leads: Array.from(leadsInMemoryDb.entries()).map(([id, val]) => ({ id, ...val })),
        tasks: Array.from(tasksInMemoryDb.entries()).map(([id, val]) => ({ id, ...val }))
      },
      timestamp: new Date().toISOString()
    });
  }
}


