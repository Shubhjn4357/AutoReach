import { getSecureItem } from "./store";
import {
  getQueuedOperations,
  dequeueSyncOperation,
  incrementSyncAttempt,
  vacuumDatabase,
} from "./db";

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
const MAX_BACKOFF_MS = 60000; // Cap backoff at 60s

export async function executeSyncCycle(): Promise<{
  success: boolean;
  syncedCount: number;
}> {
  try {
    const allQueue = await getQueuedOperations();
    if (allQueue.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    const token = await getSecureItem("auth_token");
    if (!token) {
      console.log("No token in secure storage; skipping sync.");
      return { success: false, syncedCount: 0 };
    }

    // Filter queue items to ONLY include campaigns, using exponential backoff
    const now = Date.now();
    const eligibleOperations = allQueue.filter((item) => {
      if (item.table !== "campaigns") return false;
      const attempts = item.attempts || 0;
      if (attempts === 0) return true;
      const delay = Math.min(Math.pow(2, attempts) * 1000, MAX_BACKOFF_MS);
      return now - item.createdAt >= delay;
    });

    if (eligibleOperations.length === 0) {
      console.log("Sync skipped: all items are backed off.");
      return { success: true, syncedCount: 0 };
    }

    const operationsPayload = eligibleOperations.map((q) => ({
      table: q.table,
      operation: q.operation,
      recordId: q.recordId,
      payload: q.payload,
      createdAt: q.createdAt,
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ operations: operationsPayload }),
      });

      if (!response.ok) {
        throw new Error(`Sync API responded with code: ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data?.syncedIds) {
        const syncedIds = result.data.syncedIds as string[];
        for (const op of eligibleOperations) {
          if (syncedIds.includes(op.recordId)) {
            await dequeueSyncOperation(op.id);
          } else {
            await incrementSyncAttempt(op.id);
          }
        }
        
        // Trigger background VACUUM to reclaim disk space after changes
        vacuumDatabase().catch((err) => {
          console.warn("Periodic SQLite vacuum failed:", err);
        });

        return { success: true, syncedCount: syncedIds.length };
      }

      // If response did not indicate success
      for (const op of eligibleOperations) {
        await incrementSyncAttempt(op.id);
      }
      return { success: false, syncedCount: 0 };
    } catch (networkError) {
      console.warn(
        "Network sync dispatch failed, logging attempts in SQLite:",
        networkError,
      );
      for (const op of eligibleOperations) {
        await incrementSyncAttempt(op.id);
      }
      return { success: false, syncedCount: 0 };
    }
  } catch (error) {
    console.error("Critical sync execution error:", error);
    return { success: false, syncedCount: 0 };
  }
}
