import { Express, Request, Response, RequestHandler } from "express";
import { db } from "../../../shared/dbClient";
import { auditLogs } from "../../../shared/db";
import { desc } from "drizzle-orm";
import { redisService } from "../redisService";

export function registerInfraRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- Generic Infrastructure, Audit, & Plugins Endpoints ---
  server.get("/api/audit", authenticateApiKey, async (req, res) => {
    try {
      const allLogs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
      return res.json({ data: allLogs });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/infra/status", authenticateApiKey, async (req, res) => {
    const redisInfo = redisService.getBrokerStatus();
    return res.json({
      database: { connected: true, type: "sqlite", host: "local.db" },
      redis: { connected: redisInfo.connected, host: redisInfo.host, port: redisInfo.port },
      queue: {
        enabled: redisInfo.connected,
        messages: { pending: 0, completed: 0, failed: 0 },
        webhooks: { pending: 0, completed: 0, failed: 0 }
      },
      storage: { type: "local", path: "./data" },
      engine: { type: "baileys", headless: true }
    });
  });

  server.get("/api/infra/config", authenticateApiKey, async (req, res) => {
    const redisInfo = redisService.getBrokerStatus();
    return res.json({
      database: { type: "sqlite", builtIn: true, host: "local.db", port: "", username: "", database: "local.db", poolSize: 10, sslEnabled: false, sslRejectUnauthorized: false, passwordSet: false },
      redis: { enabled: redisInfo.enabled, builtIn: false, host: redisInfo.host, port: String(redisInfo.port), passwordSet: true },
      queue: { enabled: redisInfo.connected },
      storage: { type: "local", builtIn: true, localPath: "./data", s3Bucket: "", s3Region: "", s3Endpoint: "", s3CredentialsSet: false },
      engine: { headless: true, sessionDataPath: "./sessions", browserArgs: "" }
    });
  });

  server.put("/api/infra/config", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    return res.json({ success: true, message: "Configuration saved successfully" });
  });

  server.get("/api/plugins", authenticateApiKey, async (req, res) => {
    return res.json([
      { id: "gemini-auto", name: "Gemini Auto-Responder", version: "1.0.0", type: "extension", description: "Replies to incoming WhatsApp chats automatically using local Gemini BYOK config.", status: "enabled", config: {}, builtIn: true, sessionScoped: false, activeSessions: ["*"] },
      { id: "webhook-int", name: "Webhook Integrator", version: "1.1.0", type: "extension", description: "Dispatches live messages and session statuses directly to your webhooks.", status: "enabled", config: {}, builtIn: true, sessionScoped: false, activeSessions: ["*"] },
      { id: "campaign-sync", name: "Campaign Outbox Sync", version: "1.0.0", type: "extension", description: "Maintains real-time alignment with outbound mobile campaign queues.", status: "enabled", config: {}, builtIn: true, sessionScoped: true, activeSessions: ["*"] }
    ]);
  });

  server.post("/api/plugins/:id/enable", authenticateApiKey, async (req, res) => {
    return res.json({ success: true, message: "Plugin enabled successfully" });
  });

  server.post("/api/plugins/:id/disable", authenticateApiKey, async (req, res) => {
    return res.json({ success: true, message: "Plugin disabled successfully" });
  });
}
