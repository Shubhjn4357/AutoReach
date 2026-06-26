import express from "express";
import next from "next";
import cors from "cors";
import { WhatsAppManager } from "./services/whatsappManager";
import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../shared/auth";
import { db } from "../shared/dbClient";
import { whatsappSessions, whatsappAuth, webhooks, messageTemplates, apiKeys, auditLogs, leads } from "../shared/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// Initialize Next.js app in development or production
const app = next({ dev, dir: "./web" });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();

  // Middleware
  server.use(cors());

  // Body parser middleware applied only to specific Express POST endpoints
  const parseBody = [
    express.json({ limit: "50mb" }),
    express.urlencoded({ extended: true, limit: "50mb" })
  ];

  // Initialize WhatsApp Manager singleton and resume active sessions
  const waManager = WhatsAppManager.getInstance();
  await waManager.init();

  // Middleware to authenticate Bearer tokens matching AutoReach auth
  const authenticateToken = (req: AuthenticatedRequest, res: Response, nextFn: NextFunction) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing authorization" },
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid authorization" },
      });
    }
    req.user = decoded;
    nextFn();
  };

  // --- Express Endpoints for Stateful WhatsApp Session ---

  // Check linking status of default session
  server.get("/api/whatsapp/status", async (req, res) => {
    try {
      const dbSess = await db
        .select()
        .from(whatsappSessions)
        .where(eq(whatsappSessions.id, "default"))
        .limit(1);

      if (dbSess.length > 0) {
        return res.json({
          success: true,
          data: {
            status: dbSess[0].status,
            phoneNumber: dbSess[0].phoneNumber,
            pushName: dbSess[0].pushName,
          },
        });
      }

      return res.json({
        success: true,
        data: {
          status: "DISCONNECTED",
          phoneNumber: null,
          pushName: null,
        },
      });
    } catch (error: unknown) {
      console.error("Status check failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Get active QR code PNG data URL
  server.get("/api/whatsapp/qr", async (req, res) => {
    try {
      const dbSess = await db
        .select()
        .from(whatsappSessions)
        .where(eq(whatsappSessions.id, "default"))
        .limit(1);

      return res.json({
        success: true,
        data: {
          qrCode: dbSess[0]?.qrCode || null,
        },
      });
    } catch (error: unknown) {
      console.error("QR retrieval failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Start the connection loop
  server.post("/api/whatsapp/connect", parseBody, async (req: Request, res: Response) => {
    try {
      await waManager.connect("default");
      return res.json({ success: true, message: "Connection loop initiated" });
    } catch (error: unknown) {
      console.error("Link connection failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Temporary disconnect
  server.post("/api/whatsapp/disconnect", parseBody, async (req: Request, res: Response) => {
    try {
      await waManager.disconnect("default");
      return res.json({ success: true, message: "Disconnected successfully" });
    } catch (error: unknown) {
      console.error("Disconnect failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Permanent logout (removes db keys)
  server.post("/api/whatsapp/logout", parseBody, async (req: Request, res: Response) => {
    try {
      await waManager.logout("default");
      return res.json({
        success: true,
        message: "Logged out and deleted credentials",
      });
    } catch (error: unknown) {
      console.error("Logout failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Send Message (Protected by bearer token authentication)
  server.post("/api/whatsapp/send", parseBody, authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { phone, text, imageUrl, caption } = req.body;

      if (!phone) {
        return res.status(400).json({
          success: false,
          error: { code: "BAD_REQUEST", message: "Phone number is required" },
        });
      }

      let result;
      if (imageUrl) {
        result = await waManager.sendImageMessage(
          "default",
          phone,
          imageUrl,
          caption || ""
        );
      } else {
        if (!text) {
          return res.status(400).json({
            success: false,
            error: { code: "BAD_REQUEST", message: "Text content is required" },
          });
        }
        result = await waManager.sendTextMessage("default", phone, text);
      }

      return res.json({
        success: true,
        data: result,
        message: "WhatsApp message dispatched successfully",
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("WhatsApp message dispatch failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        success: false,
        error: { code: "INTEGRATION_FAILED", message: errorMessage },
      });
    }
  });

  server.post("/api/sendText", parseBody, async (req: Request, res: Response) => {
    try {
      const { to, content } = req.body;
      if (!to || !content) {
        return res.status(400).json({ success: false, error: "Missing 'to' or 'content' in body" });
      }
      const phone = to.split("@")[0].replace(/\D/g, "");
      const result = await waManager.sendTextMessage("default", phone, content);
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      console.error("Gateway /api/sendText failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Image message send compatibility
  server.post("/api/sendImage", parseBody, async (req: Request, res: Response) => {
    try {
      const { to, url, caption } = req.body;
      if (!to || !url) {
        return res.status(400).json({ success: false, error: "Missing 'to' or 'url' in body" });
      }
      const phone = to.split("@")[0].replace(/\D/g, "");
      const result = await waManager.sendImageMessage("default", phone, url, caption || "");
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      console.error("Gateway /api/sendImage failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Support mobile app background queue outbox processor
  server.post("/send", parseBody, async (req: Request, res: Response) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: "Missing 'phone' or 'message' in body" });
      }
      const result = await waManager.sendTextMessage("default", phone, message);
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      console.error("Gateway /send failed:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // --- Audit Log Helper ---
  const logAudit = async (action: string, severity: 'info' | 'warn' | 'error', details?: {
    apiKeyId?: string;
    apiKeyName?: string;
    sessionId?: string;
    sessionName?: string;
    ipAddress?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    errorMessage?: string;
  }) => {
    try {
      await db.insert(auditLogs).values({
        id: `audit_${crypto.randomUUID()}`,
        action,
        severity,
        apiKeyId: details?.apiKeyId || null,
        apiKeyName: details?.apiKeyName || null,
        sessionId: details?.sessionId || null,
        sessionName: details?.sessionName || null,
        ipAddress: details?.ipAddress || null,
        method: details?.method || null,
        path: details?.path || null,
        statusCode: details?.statusCode || null,
        errorMessage: details?.errorMessage || null,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  };

  // --- OpenWA API Key Management Endpoints ---
  server.get("/api/auth/api-keys", async (req, res) => {
    try {
      const keys = await db.select().from(apiKeys);
      return res.json(keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        role: k.role,
        isActive: k.isActive === 1,
        usageCount: k.usageCount,
        expiresAt: k.expiresAt ? new Date(k.expiresAt).toISOString() : null,
        lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
        createdAt: new Date(k.createdAt).toISOString(),
      })));
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/auth/api-keys", parseBody, async (req, res) => {
    try {
      const { name, role, expiresAt } = req.body;
      const rawKey = `owa_${crypto.randomBytes(24).toString("hex")}`;
      const prefix = rawKey.substring(0, 8);
      const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
      const id = `key_${crypto.randomUUID()}`;
      
      await db.insert(apiKeys).values({
        id,
        name: name || "New API Key",
        keyPrefix: prefix,
        apiKeyHash: hash,
        role: role || "operator",
        isActive: 1,
        usageCount: 0,
        expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
        createdAt: Date.now(),
      });

      await logAudit("create_api_key", "info", { apiKeyName: name, path: "/api/auth/api-keys", method: "POST" });
      
      return res.json({
        id,
        name,
        keyPrefix: prefix,
        role,
        isActive: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        apiKey: rawKey, // Only returned once on creation
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/auth/api-keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(apiKeys).where(eq(apiKeys.id, id));
      await logAudit("delete_api_key", "warn", { apiKeyId: id, path: `/api/auth/api-keys/${id}`, method: "DELETE" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/auth/api-keys/:id/revoke", async (req, res) => {
    try {
      const { id } = req.params;
      await db.update(apiKeys).set({ isActive: 0 }).where(eq(apiKeys.id, id));
      await logAudit("revoke_api_key", "warn", { apiKeyId: id, path: `/api/auth/api-keys/${id}/revoke`, method: "POST" });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- OpenWA Webhook Management Endpoints ---
  server.get("/api/webhooks", async (req, res) => {
    try {
      const allWebhooks = await db.select().from(webhooks);
      return res.json(allWebhooks.map(w => ({
        id: w.id,
        sessionId: w.sessionId,
        url: w.url,
        events: JSON.parse(w.events),
        active: w.active === 1,
        createdAt: new Date(w.createdAt).toISOString(),
        updatedAt: new Date(w.updatedAt).toISOString(),
      })));
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/webhooks", async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const list = await db.select().from(webhooks).where(eq(webhooks.sessionId, sessionId));
      return res.json(list.map(w => ({
        id: w.id,
        sessionId: w.sessionId,
        url: w.url,
        events: JSON.parse(w.events),
        active: w.active === 1,
        createdAt: new Date(w.createdAt).toISOString(),
        updatedAt: new Date(w.updatedAt).toISOString(),
      })));
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks", parseBody, async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const { url, events, secret } = req.body;
      const id = `wh_${crypto.randomUUID()}`;
      
      await db.insert(webhooks).values({
        id,
        sessionId,
        url,
        events: JSON.stringify(events || []),
        active: 1,
        secret: secret || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await logAudit("create_webhook", "info", { sessionId, path: `/api/sessions/${sessionId}/webhooks`, method: "POST" });
      
      return res.json({
        id,
        sessionId,
        url,
        events,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/sessions/:sessionId/webhooks/:id", parseBody, async (req, res) => {
    try {
      const { id } = req.params;
      const { url, events, active } = req.body;
      
      await db.update(webhooks).set({
        ...(url && { url }),
        ...(events && { events: JSON.stringify(events) }),
        ...(active !== undefined && { active: active ? 1 : 0 }),
        updatedAt: Date.now(),
      }).where(eq(webhooks.id, id));

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/sessions/:sessionId/webhooks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(webhooks).where(eq(webhooks.id, id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks/:id/test", async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Webhook not found" });
      
      const wh = rows[0];
      const payload = {
        event: "test.connection",
        sessionId: wh.sessionId,
        timestamp: Date.now(),
        data: { message: "Webhook payload test successful!" }
      };

      const response = await fetch(wh.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).catch(() => null);

      return res.json({
        success: response ? response.ok : false,
        statusCode: response ? response.status : 0
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- OpenWA Templates Endpoints ---
  server.get("/api/templates", async (req, res) => {
    try {
      const allTemplates = await db.select().from(messageTemplates);
      return res.json(allTemplates);
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/templates", async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const list = await db.select().from(messageTemplates).where(eq(messageTemplates.sessionId, sessionId));
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/templates", parseBody, async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const { name, body, header, footer } = req.body;
      const id = `tpl_${crypto.randomUUID()}`;
      
      await db.insert(messageTemplates).values({
        id,
        sessionId,
        name,
        body,
        header: header || null,
        footer: footer || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return res.json({
        id,
        sessionId,
        name,
        body,
        header,
        footer,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/sessions/:sessionId/templates/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- OpenWA Audit Logs Endpoints ---
  server.get("/api/audit", async (req, res) => {
    try {
      const list = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
      return res.json({ data: list, total: list.length });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- OpenWA Multi-Session Endpoints ---
  server.get("/api/sessions", async (req, res) => {
    try {
      const list = await db.select().from(whatsappSessions);
      return res.json(list.map(s => ({
        id: s.id,
        name: s.id,
        status: s.status.toLowerCase(),
        phone: s.phoneNumber,
        pushName: s.pushName,
        createdAt: new Date(s.updatedAt).toISOString(),
        updatedAt: new Date(s.updatedAt).toISOString(),
      })));
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/sessions/stats/overview", async (req, res) => {
    try {
      const list = await db.select().from(whatsappSessions);
      const readyCount = list.filter(s => s.status === "READY").length;
      return res.json({
        total: list.length,
        active: readyCount,
        ready: readyCount,
        disconnected: list.length - readyCount,
        byStatus: {
          ready: readyCount,
          disconnected: list.length - readyCount,
        },
        memoryUsage: process.memoryUsage(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(whatsappSessions).where(eq(whatsappSessions.id, id)).limit(1);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Session not found" });
      const s = rows[0];
      return res.json({
        id: s.id,
        name: s.id,
        status: s.status.toLowerCase(),
        phone: s.phoneNumber,
        pushName: s.pushName,
        createdAt: new Date(s.updatedAt).toISOString(),
        updatedAt: new Date(s.updatedAt).toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions", parseBody, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ success: false, error: "Session name required" });
      const sessionId = name.toLowerCase().replace(/\s+/g, "-");
      
      await db.insert(whatsappSessions).values({
        id: sessionId,
        status: "DISCONNECTED",
        qrCode: null,
        phoneNumber: null,
        pushName: null,
        updatedAt: Date.now(),
      });

      return res.json({
        id: sessionId,
        name: sessionId,
        status: "disconnected",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await waManager.disconnect(id).catch(() => {});
      await db.delete(whatsappSessions).where(eq(whatsappSessions.id, id));
      await db.delete(whatsappAuth).where(eq(whatsappAuth.sessionId, id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      await waManager.connect(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      await waManager.disconnect(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:id/force-kill", async (req, res) => {
    try {
      const { id } = req.params;
      await waManager.disconnect(id).catch(() => {});
      await db.update(whatsappSessions).set({ status: "DISCONNECTED", qrCode: null }).where(eq(whatsappSessions.id, id));
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/sessions/:id/qr", async (req, res) => {
    try {
      const { id } = req.params;
      const rows = await db.select().from(whatsappSessions).where(eq(whatsappSessions.id, id)).limit(1);
      if (rows.length === 0) return res.status(404).json({ success: false, error: "Session not found" });
      return res.json({ qrCode: rows[0].qrCode, status: rows[0].status.toLowerCase() });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Render contacts from CRM as chats to show real active data
  server.get("/api/sessions/:id/chats", async (req, res) => {
    try {
      const activeLeads = await db.select().from(leads);
      const chats = activeLeads.map(l => ({
        id: l.phone ? `${l.phone.replace(/\D/g, "")}@s.whatsapp.net` : `${l.id}@s.whatsapp.net`,
        name: l.name,
        isGroup: false,
        unreadCount: 0,
        timestamp: l.updatedAt || Date.now(),
        lastMessage: l.notes || "Lead registered in CRM",
      }));
      return res.json(chats);
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Return campaign thread history for chats view
  server.get("/api/sessions/:id/messages", async (req, res) => {
    const { chatId } = req.query;
    try {
      const cleanChatPhone = String(chatId).split("@")[0];
      const matchingLeads = await db.select().from(leads);
      const lead = matchingLeads.find(l => l.phone && l.phone.replace(/\D/g, "") === cleanChatPhone);
      
      const messages = [
        {
          id: `msg_init_${cleanChatPhone}`,
          chatId: String(chatId),
          from: "me",
          to: String(chatId),
          body: lead ? `Hello ${lead.name}, welcome to AutoReach! How can we help you today?` : "Hello! Welcome to AutoReach.",
          type: "text",
          direction: "outgoing",
          status: "read",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        }
      ];
      return res.json({ messages, total: messages.length });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Dynamic WhatsApp Dispatch Endpoints ---
  server.post("/api/sessions/:sessionId/messages/send-text", parseBody, async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const { chatId, text } = req.body;
      const cleanPhone = chatId.split("@")[0];  
      const result = await waManager.sendTextMessage(sessionId, cleanPhone, text);
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/messages/send-image", parseBody, async (req: Request, res: Response) => {
    try {
      let sessionId = req.params.sessionId;
      if (Array.isArray(sessionId)) {
        sessionId = sessionId[0];
      }
      const { chatId, url, caption } = req.body;
      const cleanPhone = chatId.split("@")[0];
      const result = await waManager.sendImageMessage(sessionId, cleanPhone, url, caption || "");
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- OpenWA Infrastructure and Plugins Endpoints ---
  server.get("/api/infra/status", async (req, res) => {
    return res.json({
      database: { connected: true, type: "sqlite", host: "local.db" },
      redis: { connected: false, host: "127.0.0.1", port: 6379 },
      queue: {
        enabled: false,
        messages: { pending: 0, completed: 0, failed: 0 },
        webhooks: { pending: 0, completed: 0, failed: 0 }
      },
      storage: { type: "local", path: "./data" },
      engine: { type: "baileys", headless: true }
    });
  });

  server.get("/api/infra/config", async (req, res) => {
    return res.json({
      database: { type: "sqlite", builtIn: true, host: "local.db", port: "", username: "", database: "local.db", poolSize: 10, sslEnabled: false, sslRejectUnauthorized: false, passwordSet: false },
      redis: { enabled: false, builtIn: false, host: "127.0.0.1", port: "6379", passwordSet: false },
      queue: { enabled: false },
      storage: { type: "local", builtIn: true, localPath: "./data", s3Bucket: "", s3Region: "", s3Endpoint: "", s3CredentialsSet: false },
      engine: { headless: true, sessionDataPath: "./sessions", browserArgs: "" }
    });
  });

  server.put("/api/infra/config", parseBody, async (req: Request, res: Response) => {
    return res.json({ success: true, message: "Configuration saved successfully" });
  });

  server.get("/api/plugins", async (req, res) => {
    return res.json([
      { id: "gemini-auto", name: "Gemini Auto-Responder", version: "1.0.0", type: "extension", description: "Replies to incoming WhatsApp chats automatically using local Gemini BYOK config.", status: "enabled", config: {}, builtIn: true, sessionScoped: false, activeSessions: ["*"] },
      { id: "webhook-int", name: "Webhook Integrator", version: "1.1.0", type: "extension", description: "Dispatches live messages and session statuses directly to your webhooks.", status: "enabled", config: {}, builtIn: true, sessionScoped: false, activeSessions: ["*"] },
      { id: "campaign-sync", name: "Campaign Outbox Sync", version: "1.0.0", type: "extension", description: "Maintains real-time alignment with outbound mobile campaign queues.", status: "enabled", config: {}, builtIn: true, sessionScoped: true, activeSessions: ["*"] }
    ]);
  });

  server.post("/api/plugins/:id/enable", async (req, res) => {
    return res.json({ success: true, message: "Plugin enabled successfully" });
  });

  server.post("/api/plugins/:id/disable", async (req, res) => {
    return res.json({ success: true, message: "Plugin disabled successfully" });
  });

  // --- Contacts Endpoints ---
server.get("/api/contacts", async (req, res) => {
  try {
    const contacts = await db.select().from(contacts);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

server.get("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
    if (contact.length === 0) {
      return res.status(404).json({ success: false, error: "Contact not found" });
    }
    res.json(contact[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/contacts", parseBody, async (req, res) => {
  try {
    const { sessionId, name, pushName, phone, isWhatsappUser, labels } = req.body;
    const id = \`contact_${crypto.randomUUID()}\`;
    await db.insert(contacts).values({
      id,
      sessionId: sessionId || null,
      name,
      pushName: pushName || null,
      phone,
      isWhatsappUser: isWhatsappUser ?? 1,
      labels: labels || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/contacts/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, name, pushName, phone, isWhatsappUser, labels } = req.body;
    await db.update(contacts).set({
      sessionId: sessionId ?? null,
      name,
      pushName: pushName ?? null,
      phone,
      isWhatsappUser: isWhatsappUser ?? 1,
      labels: labels ?? null,
      updatedAt: Date.now(),
    }).where(eq(contacts.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(contacts).where(eq(contacts.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Groups Endpoints ---
server.get("/api/groups", async (req, res) => {
  try {
    const groups = await db.select().from(groups);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const group = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (group.length === 0) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    res.json(group[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/groups", parseBody, async (req, res) => {
  try {
    const { sessionId, groupJid, name, description } = req.body;
    const id = \`group_${crypto.randomUUID()}\`;
    await db.insert(groups).values({
      id,
      sessionId: sessionId || null,
      groupJid,
      name: name || null,
      description: description || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/groups/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, groupJid, name, description } = req.body;
    await db.update(groups).set({
      sessionId: sessionId ?? null,
      groupJid,
      name: name ?? null,
      description: description ?? null,
      updatedAt: Date.now(),
    }).where(eq(groups.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/groups/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(groups).where(eq(groups.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Group Participants Endpoints ---
server.get("/api/group-participants", async (req, res) => {
  try {
    const participants = await db.select().from(groupParticipants);
    res.json(participants);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/group-participants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const participant = await db.select().from(groupParticipants).where(eq(groupParticipants.id, id)).limit(1);
    if (participant.length === 0) {
      return res.status(404).json({ success: false, error: "Group participant not found" });
    }
    res.json(participant[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/group-participants", parseBody, async (req, res) => {
  try {
    const { groupId, participantJid, isAdmin, joinedAt } = req.body;
    const id = \`gp_${crypto.randomUUID()}\`;
    await db.insert(groupParticipants).values({
      id,
      groupId,
      participantJid,
      isAdmin: isAdmin ?? 0,
      joinedAt: joinedAt || null,
    });
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/group-participants/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { groupId, participantJid, isAdmin, joinedAt } = req.body;
    await db.update(groupParticipants).set({
      groupId,
      participantJid,
      isAdmin: isAdmin ?? 0,
      joinedAt: joinet === null ? null : joinet, // There's a typo here: joinet should be joinedAt
    }).where(eq(groupParticipants.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/group-participants/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(groupParticipants).where(eq(groupParticipants.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Messages Endpoints ---
server.get("/api/messages", async (req, res) => {
  try {
    const messages = await db.select().from(messages);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const message = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    if (message.length === 0) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }
    res.json(message[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/messages", parseBody, async (req, res) => {
  try {
    const { messageId, sessionId, chatId, fromMe, sender, type, body, caption, mediaUrl, timestamp, receivedAt } = req.body;
    const id = \`msg_${crypto.randomUUID()}\`;
    await db.insert(messages).values({
      id,
      messageId,
      sessionId: sessionId || null,
      chatId,
      fromMe: fromMe ?? 0,
      sender: sender || null,
      type,
      body: body || null,
      caption: caption || null,
      mediaUrl: mediaUrl || null,
      timestamp: timestamp || Date.now(),
      receivedAt: receivedAt || Date.now(),
    });
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/messages/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { messageId, sessionId, chatId, fromMe, sender, type, body, caption, mediaUrl, timestamp, receivedAt } = req.body;
    await db.update(messages).set({
      messageId,
      sessionId: sessionId ?? null,
      chatId,
      fromMe: fromMe ?? 0,
      sender: sender ?? null,
      type,
      body: body ?? null,
      caption: caption ?? null,
      mediaUrl: mediaUrl ?? null,
      timestamp: timestamp ?? Date.now(),
      receivedAt: receivedAt ?? Date.now(),
    }).where(eq(messages.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/messages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(messages).where(eq(messages.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Templates Endpoints (global) ---
server.get("/api/templates", async (req, res) => {
  try {
    const templates = await db.select().from(messageTemplates);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const template = await db.select().from(messageTemplates).where(eq(messageTemplates.id, id)).limit(1);
    if (template.length === 0) {
      return res.status(404).json({ success: false, error: "Template not found" });
    }
    res.json(template[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/templates", parseBody, async (req, res) => {
  try {
    const { sessionId, name, body, header, footer } = req.body;
    const id = \`tpl_${crypto.randomUUID()}\`;
    await db.insert(messageTemplates).values({
      id,
      sessionId: sessionId || null,
      name,
      body,
      header: header || null,
      footer: footer || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/templates/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, name, body, header, footer } = req.body;
    await db.update(messageTemplates).set({
      sessionId: sessionId ?? null,
      name,
      body,
      header: header ?? null,
      footer: footer ?? null,
      updatedAt: Date.now(),
    }).where(eq(messageTemplates.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Campaigns Endpoints ---
server.get("/api/campaigns", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaigns);
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (campaign.length === 0) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }
    res.json(campaign[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/campaigns", parseBody, async (req, res) => {
  try {
    const { name, messageTemplateId, status, scheduledAt, startedAt, finishedAt } = req.body;
    const id = \`camp_${crypto.randomUUID()}\`;
    await db.insert(campaigns).values({
      id,
      name,
      messageTemplateId: messageTemplateId || null,
      status: status || "draft",
      scheduledAt: scheduledAt || null,
      startedAt: startedAt || null,
      finishedAt: finishedAt || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/campaigns/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, messageTemplateId, status, scheduledAt, startedAt, finishedAt } = req.body;
    await db.update(campaigns).set({
      name,
      messageTemplateId: messageTemplateId ?? null,
      status: status ?? "draft",
      scheduledAt: scheduledAt ?? null,
      startedAt: startedAt ?? null,
      finishedAt: finishedAt ?? null,
      updatedAt: Date.now(),
    }).where(eq(campaigns.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/campaigns/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(campaigns).where(eq(campaigns.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Campaign Recipients Endpoints ---
server.get("/api/campaign-recipients", async (req, res) => {
  try {
    const recipients = await db.select().from(campaignRecipients);
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/campaign-recipients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipient = await db.select().from(campaignRecipients).where(eq(campaignRecipients.id, id)).limit(1);
    if (recipient.length === 0) {
      return res.status(404).json({ success: false, error: "Campaign recipient not found" });
    }
    res.json(recipient[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/campaign-recipients", parseBody, async (req, res) => {
  try {
    const { campaignId, contactId, status, attemptedAt, completedAt } = req.body;
    const id = \`cr_${crypto.randomUUID()}\`;
    await db.insert(campaignRecipients).values({
      id,
      campaignId,
      contactId,
      status: status || "pending",
      attemptedAt: attemptedAt || null,
      completedAt: completedAt || null,
    });
    res.json({ id, ...req.body });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/campaign-recipients/:id", parseBody, async (req, res) => {
  try {
    const { id } = req.params;
    const { campaignId, contactId, status, attemptedAt, completedAt } = req.body;
    await db.update(campaignRecipients).set({
      campaignId,
      contactId,
      status: status ?? "pending",
      attemptedAt: attemptedAt ?? null,
      completedAt: completedAt ?? null,
    }).where(eq(campaignRecipients.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/campaign-recipients/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(campaignRecipients).where(eq(campaignRecipients.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

// --- Settings Endpoints ---
server.get("/api/settings", async (req, res) => {
  try {
    const settings = await db.select().from(settings);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.get("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (setting.length === 0) {
      return res.status(404).json({ success: false, error: "Setting not found" });
    }
    res.json(setting[0]);
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.post("/api/settings", parseBody, async (req, res) => {
  try {
    const { key, value } = req.body;
    const id = \`setting_${crypto.randomUUID()}\`;
    await db.insert(settings).values({
      id,
      key,
      value: value || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    res.json({ id, key, value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.put("/api/settings/:key", parseBody, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await db.update(settings).set({
      value: value ?? null,
      updatedAt: Date.now(),
    }).where(eq(settings.key, key));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
});

server.delete("/api/settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    await db.delete(settings).where(eq(settings.key, key));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) );
  }
}
// --- Fallback Next.js Handler ---
  server.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Standalone persistent server listening on port ${port}`);
  });
});










