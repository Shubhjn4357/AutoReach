import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { tasksInMemoryDb } from "../inMemoryDb";
import { db } from "../../../../shared/dbClient";
import { tasks } from "../../../../shared/db";
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

    let userTasks;
    try {
      userTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, decoded.userId));
    } catch (dbError) {
      console.error("SQLite query failed, falling back to in-memory store:", dbError);
      userTasks = Array.from(tasksInMemoryDb.values()).filter(
        (task) => task.userId === decoded.userId
      );
    }

    return NextResponse.json({
      success: true,
      data: userTasks,
      message: `Retrieved ${userTasks.length} tasks`,
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
    const { title, description, leadId, dueDate, status } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Title is required" } },
        { status: 400 }
      );
    }

    const newTaskId = `task_${Math.random().toString(36).substring(2, 11)}`;
    const nowTimestamp = Date.now();
    const resolvedDueDate = dueDate ? (typeof dueDate === "number" ? dueDate : new Date(dueDate).getTime()) : null;

    const newTask = {
      id: newTaskId,
      userId: decoded.userId,
      leadId: leadId || null,
      title,
      description: description || null,
      status: status || "PENDING",
      dueDate: resolvedDueDate,
      createdAt: nowTimestamp
    };

    try {
      await db.insert(tasks).values({
        id: newTaskId,
        userId: decoded.userId,
        leadId: leadId || null,
        title,
        description: description || null,
        status: status || "PENDING",
        dueDate: resolvedDueDate,
        createdAt: nowTimestamp
      });
    } catch (dbError) {
      console.error("SQLite insert failed, saving to in-memory store:", dbError);
      tasksInMemoryDb.set(newTaskId, {
        ...newTask,
        createdAt: nowTimestamp
      });
    }

    return NextResponse.json({
      success: true,
      data: newTask,
      message: "Task created successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
