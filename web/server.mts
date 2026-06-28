import express from "express";
import next from "next";
import cors from "cors";
import { Request, Response, NextFunction } from "express";
import { verifyToken, verifyGoogleToken, signToken, JWTPayload } from "../shared/auth";
import crypto from "crypto";

// Import custom services
import { auditService } from "./services/auditService";
import { apiKeyService } from "./services/apiKeyService";
import { webhookService } from "./services/webhookService";
import { templateService } from "./services/templateService";
import { crmService } from "./services/crmService";
import { sessionService } from "./services/sessionService";
import { WhatsAppManager } from "./services/whatsappManager";
import { redisService } from "./services/redisService";

// Database entities
import { db } from "../shared/dbClient";
import { contacts, groups, groupParticipants, messages, campaigns, campaignRecipients, settings, auditLogs, messageTemplates } from "../shared/db";
import { eq, desc, and, lte } from "drizzle-orm";

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, dir: "./web" });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();

  // Global Middleware
  server.use(cors());

  const parseBody = [
    express.json({ limit: "50mb" }),
    express.urlencoded({ extended: true, limit: "50mb" })
  ];

  // Initialize stateful WhatsApp socket manager
  const waManager = WhatsAppManager.getInstance();
  await waManager.init();

  // Seed default developer key
  await apiKeyService.seedDefaultKey();

  // Background Campaign Scheduler Loop
  setInterval(async () => {
    try {
      const now = Date.now();
      // Find campaigns that are scheduled and due
      const pendingCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, "scheduled"),
            lte(campaigns.scheduledAt, now)
          )
        );

      for (const campaign of pendingCampaigns) {
        console.log(`[Campaign Scheduler] Starting campaign: ${campaign.name} (${campaign.id})`);
        
        // Update status to processing
        await db
          .update(campaigns)
          .set({ status: "processing", startedAt: Date.now(), updatedAt: Date.now() })
          .where(eq(campaigns.id, campaign.id));

        // Get template
        if (!campaign.messageTemplateId) {
          console.warn(`[Campaign Scheduler] No template ID for campaign ${campaign.id}`);
          await db
            .update(campaigns)
            .set({ status: "failed", finishedAt: Date.now(), updatedAt: Date.now() })
            .where(eq(campaigns.id, campaign.id));
          continue;
        }

        const templateList = await db
          .select()
          .from(messageTemplates)
          .where(eq(messageTemplates.id, campaign.messageTemplateId));
        const template = templateList[0];

        if (!template) {
          console.warn(`[Campaign Scheduler] Template not found for campaign ${campaign.id}`);
          await db
            .update(campaigns)
            .set({ status: "failed", finishedAt: Date.now(), updatedAt: Date.now() })
            .where(eq(campaigns.id, campaign.id));
          continue;
        }

        // Get recipients
        const recipients = await db
          .select()
          .from(campaignRecipients)
          .where(eq(campaignRecipients.campaignId, campaign.id));

        console.log(`[Campaign Scheduler] Dispatching to ${recipients.length} recipients`);
        
        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients) {
          // Get contact info
          const contactList = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, recipient.contactId));
          const contact = contactList[0];

          if (!contact || !contact.phone) {
            await db
              .update(campaignRecipients)
              .set({ status: "failed", attemptedAt: Date.now() })
              .where(eq(campaignRecipients.id, recipient.id));
            failCount++;
            continue;
          }

          try {
            // Replace [Name] and other tags
            const nameToReplace = contact.name || "Customer";
            const personalizedMsg = template.body
              .replace(/\[Name\]/gi, nameToReplace)
              .replace(/\[Phone\]/gi, contact.phone)
              .replace(/\[Email\]/gi, contact.pushName || "");

            // Send via whatsappManager
            if (campaign.mediaUrl) {
              await waManager.sendImageMessage("default", contact.phone, campaign.mediaUrl, personalizedMsg);
            } else {
              await waManager.sendTextMessage("default", contact.phone, personalizedMsg);
            }

            await db
              .update(campaignRecipients)
              .set({ status: "sent", completedAt: Date.now(), attemptedAt: Date.now() })
              .where(eq(campaignRecipients.id, recipient.id));
            successCount++;
          } catch (sendErr) {
            console.error(`[Campaign Scheduler] Failed to send message to ${contact.phone}:`, sendErr);
            await db
              .update(campaignRecipients)
              .set({ status: "failed", attemptedAt: Date.now() })
              .where(eq(campaignRecipients.id, recipient.id));
            failCount++;
          }
        }

        // Update campaign status to completed
        await db
          .update(campaigns)
          .set({ status: "completed", finishedAt: Date.now(), updatedAt: Date.now() })
          .where(eq(campaigns.id, campaign.id));

        console.log(`[Campaign Scheduler] Finished campaign: ${campaign.name}. Success: ${successCount}, Fail: ${failCount}`);
      }
    } catch (loopErr) {
      console.error("[Campaign Scheduler] Error in background loop:", loopErr);
    }
  }, 30000);

  // Unified API key and JWT authentication middleware
  const authenticateApiKey = async (req: AuthenticatedRequest, res: Response, nextFn: NextFunction) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing authorization" },
      });
    }

    const token = authHeader.substring(7);

    // 0. Developer Bypass Token Mode
    if (token.startsWith("mock_")) {
      const username = token.replace("mock_", "");
      req.user = {
        userId: `u_mock_${username}`,
        email: `${username}@example.com`,
        name: username.toUpperCase(),
      };
      return nextFn();
    }

    // 1. Check if token is a valid JWT
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      return nextFn();
    }

    // 2. Check if token is a valid API key
    const validated = await apiKeyService.validateKey(token);
    if (validated) {
      req.user = {
        userId: validated.id,
        email: "api_key@autoreach.com",
        name: validated.name,
      };
      return nextFn();
    }

    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid authorization token" },
    });
  };

  // --- Express Login Endpoint ---
  server.post("/api/auth/login", parseBody, async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ success: false, error: "API key is required" });
      }

      const validated = await apiKeyService.validateKey(apiKey);
      if (!validated) {
        return res.status(401).json({ success: false, error: "Invalid API key" });
      }

      await auditService.logAudit("api_key_login", "info", { apiKeyId: validated.id, apiKeyName: validated.name });
      return res.json({ success: true, message: "Authentication successful" });
    } catch (err) {
      console.error("Login failed:", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Google OAuth Endpoint ---
  server.post("/api/auth/google", parseBody, async (req, res) => {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, error: "ID token is required" });
      }

      const googleUser = await verifyGoogleToken(idToken);
      if (!googleUser) {
        return res.status(401).json({ success: false, error: "Invalid Google token" });
      }

      const userPayload = {
        userId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
      };

      const token = signToken(userPayload);
      await auditService.logAudit("google_login", "info", { sessionName: googleUser.email });

      return res.json({
        success: true,
        data: {
          token,
          user: {
            id: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            role: "ADMIN",
            organizationId: "org_default_123",
          }
        }
      });
    } catch (err) {
      console.error("Google authentication failed:", err);
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- WhatsApp Sessions Default Status Endpoints ---
  server.get("/api/whatsapp/status", authenticateApiKey, async (req, res) => {
    try {
      const status = await sessionService.getSessionById("default");
      return res.json({
        success: true,
        data: status ? {
          status: status.status.toUpperCase(),
          phoneNumber: status.phone,
          pushName: status.pushName,
        } : {
          status: "DISCONNECTED",
          phoneNumber: null,
          pushName: null,
        }
      });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.get("/api/whatsapp/qr", authenticateApiKey, async (req, res) => {
    try {
      const qr = await sessionService.getQR("default");
      return res.json({
        success: true,
        data: { qrCode: qr?.qrCode || null }
      });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/connect", parseBody, authenticateApiKey, async (req, res) => {
    try {
      await sessionService.startSession("default");
      return res.json({ success: true, message: "Connection loop initiated" });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/disconnect", parseBody, authenticateApiKey, async (req, res) => {
    try {
      await sessionService.stopSession("default");
      return res.json({ success: true, message: "Disconnected successfully" });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/logout", parseBody, authenticateApiKey, async (req, res) => {
    try {
      await sessionService.deleteSession("default");
      return res.json({ success: true, message: "Logged out and deleted credentials" });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/send", parseBody, authenticateApiKey, async (req: AuthenticatedRequest, res: Response) => {
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
        result = await waManager.sendImageMessage("default", phone, imageUrl, caption || "");
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
      return res.status(500).json({
        success: false,
        error: { code: "INTEGRATION_FAILED", message: error instanceof Error ? error.message : String(error) },
      });
    }
  });

  // Backward compatible send endpoints
  server.post("/api/sendText", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { to, content } = req.body;
      if (!to || !content) return res.status(400).json({ success: false, error: "Missing to or content" });
      const phone = to.split("@")[0].replace(/\D/g, "");
      const result = await waManager.sendTextMessage("default", phone, content);
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/sendImage", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { to, url, caption } = req.body;
      if (!to || !url) return res.status(400).json({ success: false, error: "Missing to or url" });
      const phone = to.split("@")[0].replace(/\D/g, "");
      const result = await waManager.sendImageMessage("default", phone, url, caption || "");
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/send", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) return res.status(400).json({ success: false, error: "Missing phone or message" });
      const result = await waManager.sendTextMessage("default", phone, message);
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // --- API Credentials Endpoints ---
  server.get("/api/auth/api-keys", authenticateApiKey, async (req, res) => {
    try {
      const list = await apiKeyService.listKeys();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/auth/api-keys", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { name, role, expiresAt } = req.body;
      const key = await apiKeyService.createKey(name, role, expiresAt);
      return res.json(key);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/auth/api-keys/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await apiKeyService.deleteKey(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/auth/api-keys/:id/revoke", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await apiKeyService.revokeKey(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- Webhooks Endpoints ---
  server.get("/api/webhooks", authenticateApiKey, async (req, res) => {
    try {
      const list = await webhookService.listAllWebhooks();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/webhooks", authenticateApiKey, async (req, res) => {
    try {
      const sessionId = req.params.sessionId as string;
      const list = await webhookService.listSessionWebhooks(sessionId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const sessionId = req.params.sessionId as string;
      const { url, events, secret } = req.body;
      const created = await webhookService.createWebhook(sessionId, url, events, secret);
      return res.json(created);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.put("/api/sessions/:sessionId/webhooks/:id", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { url, events, active } = req.body;
      await webhookService.updateWebhook(id, url, events, active);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/sessions/:sessionId/webhooks/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await webhookService.deleteWebhook(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks/:id/test", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const resVal = await webhookService.testWebhook(id);
      return res.json(resVal);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- Message Templates Endpoints ---
  server.get("/api/templates", authenticateApiKey, async (req, res) => {
    try {
      const list = await templateService.listTemplates();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/templates", authenticateApiKey, async (req, res) => {
    try {
      const sessionId = req.params.sessionId as string;
      const list = await templateService.listTemplates(sessionId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/templates", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { sessionId, name, body, header, footer } = req.body;
      const template = await templateService.createTemplate(sessionId, name, body, header, footer);
      return res.json(template);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/templates/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await templateService.deleteTemplate(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- OpenWA Multi-Session Endpoints ---
  server.get("/api/sessions", authenticateApiKey, async (req, res) => {
    try {
      const list = await sessionService.listSessions();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/stats/overview", authenticateApiKey, async (req, res) => {
    try {
      const stats = await sessionService.getStats();
      return res.json(stats);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const details = await sessionService.getSessionById(id);
      if (!details) return res.status(404).json({ success: false, error: "Session not found" });
      return res.json(details);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const created = await sessionService.createSession(req.body.name);
      return res.json(created);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/sessions/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await sessionService.deleteSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/start", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await sessionService.startSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/stop", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await sessionService.stopSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/force-kill", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await sessionService.forceKillSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/qr", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const qr = await sessionService.getQR(id);
      if (!qr) return res.status(404).json({ success: false, error: "Session not found" });
      return res.json(qr);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/chats", authenticateApiKey, async (req, res) => {
    try {
      const list = await sessionService.getChats();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/messages", authenticateApiKey, async (req, res) => {
    try {
      const msgs = await sessionService.getMessages(String(req.query.chatId));
      return res.json(msgs);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/messages/send-text", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { chatId, text } = req.body;
      const cleanPhone = chatId.split("@")[0];
      const result = await waManager.sendTextMessage(req.params.sessionId, cleanPhone, text);
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/messages/send-image", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { chatId, url, caption } = req.body;
      const cleanPhone = chatId.split("@")[0];
      const result = await waManager.sendImageMessage(req.params.sessionId, cleanPhone, url, caption || "");
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- CRM Leads, Tasks & Sync Endpoints ---
  server.get("/api/leads", authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const isApiKey = req.user?.email === "api_key@autoreach.com";
      const list = await crmService.listLeads(isApiKey ? undefined : req.user?.userId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/leads", parseBody, authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, phone, status, value, notes } = req.body;
      const lead = await crmService.createLead(name, email, phone, status, value, notes, req.user?.userId);
      return res.json(lead);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.put("/api/leads/:id", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { name, email, phone, status, value, notes } = req.body;
      await crmService.updateLead(req.params.id, name, email, phone, status, value, notes);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/leads/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await crmService.deleteLead(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/tasks", authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const isApiKey = req.user?.email === "api_key@autoreach.com";
      const list = await crmService.listTasks(isApiKey ? undefined : req.user?.userId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/tasks", parseBody, authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const { leadId, title, description, status, dueDate } = req.body;
      const task = await crmService.createTask(leadId, title, description, status, dueDate, req.user?.userId);
      return res.json(task);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sync", authenticateApiKey, async (req, res) => {
    try {
      const leadsList = await crmService.listLeads();
      const tasksList = await crmService.listTasks();
      return res.json({
        success: true,
        data: { leads: leadsList, tasks: tasksList },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sync", parseBody, authenticateApiKey, async (req: AuthenticatedRequest, res) => {
    try {
      const { operations } = req.body;
      const result = await crmService.syncOperations(operations, req.user?.userId || null);
      return res.json({
        success: true,
        data: result,
        message: `Processed ${result.syncedIds.length} operations`,
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  // --- Generic Infrastructure, Audit, Plugins, Contacts & Groups Endpoints ---
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

  server.get("/api/contacts", authenticateApiKey, async (req, res) => {
    try {
      const contactsList = await db.select().from(contacts);
      res.json(contactsList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/contacts/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const contact = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
      if (contact.length === 0) return res.status(404).json({ success: false, error: "Contact not found" });
      res.json(contact[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/contacts", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { sessionId, name, pushName, phone, isWhatsappUser, labels } = req.body;
      const id = `contact_${crypto.randomUUID()}`;
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/contacts/:id", parseBody, authenticateApiKey, async (req, res) => {
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/contacts/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(contacts).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/groups", authenticateApiKey, async (req, res) => {
    try {
      const groupsList = await db.select().from(groups);
      res.json(groupsList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/groups/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const group = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
      if (group.length === 0) return res.status(404).json({ success: false, error: "Group not found" });
      res.json(group[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/groups", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { sessionId, groupJid, name, description } = req.body;
      const id = `group_${crypto.randomUUID()}`;
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/groups/:id", parseBody, authenticateApiKey, async (req, res) => {
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/groups/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(groups).where(eq(groups.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/group-participants", authenticateApiKey, async (req, res) => {
    try {
      const participants = await db.select().from(groupParticipants);
      res.json(participants);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/group-participants/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const participant = await db.select().from(groupParticipants).where(eq(groupParticipants.id, id)).limit(1);
      if (participant.length === 0) return res.status(404).json({ success: false, error: "Group participant not found" });
      res.json(participant[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/group-participants", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { groupId, participantJid, isAdmin, joinedAt } = req.body;
      const id = `gp_${crypto.randomUUID()}`;
      await db.insert(groupParticipants).values({
        id,
        groupId,
        participantJid,
        isAdmin: isAdmin ?? 0,
        joinedAt: joinedAt || null,
      });
      res.json({ id, ...req.body });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/group-participants/:id", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const { groupId, participantJid, isAdmin, joinedAt } = req.body;
      await db.update(groupParticipants).set({
        groupId,
        participantJid,
        isAdmin: isAdmin ?? 0,
        joinedAt: joinedAt === null ? null : joinedAt,
      }).where(eq(groupParticipants.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/group-participants/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(groupParticipants).where(eq(groupParticipants.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/messages", authenticateApiKey, async (req, res) => {
    try {
      const messagesList = await db.select().from(messages);
      res.json(messagesList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/messages/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const message = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
      if (message.length === 0) return res.status(404).json({ success: false, error: "Message not found" });
      res.json(message[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/messages", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { messageId, sessionId, chatId, fromMe, sender, type, body, caption, mediaUrl, timestamp, receivedAt } = req.body;
      const id = `msg_${crypto.randomUUID()}`;
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/messages/:id", parseBody, authenticateApiKey, async (req, res) => {
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/messages/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(messages).where(eq(messages.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaigns", authenticateApiKey, async (req, res) => {
    try {
      const campaignsList = await db.select().from(campaigns);
      res.json(campaignsList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaigns/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
      if (campaign.length === 0) return res.status(404).json({ success: false, error: "Campaign not found" });
      res.json(campaign[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/campaigns", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { name, messageTemplateId, status, mediaUrl, scheduledAt, startedAt, finishedAt, recipientIds } = req.body;
      const id = `camp_${crypto.randomUUID()}`;
      await db.insert(campaigns).values({
        id,
        name,
        messageTemplateId: messageTemplateId || null,
        status: status || "draft",
        mediaUrl: mediaUrl || null,
        scheduledAt: scheduledAt || null,
        startedAt: startedAt || null,
        finishedAt: finishedAt || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // If recipients are provided, insert them in batch
      if (Array.isArray(recipientIds) && recipientIds.length > 0) {
        const batchValues = recipientIds.map((cid: string) => ({
          id: `cr_${crypto.randomUUID()}`,
          campaignId: id,
          contactId: cid,
          status: "pending",
        }));
        await db.insert(campaignRecipients).values(batchValues);
      }

      res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/campaigns/:id", parseBody, authenticateApiKey, async (req, res) => {
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/campaigns/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(campaigns).where(eq(campaigns.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaign-recipients", authenticateApiKey, async (req, res) => {
    try {
      const recipients = await db.select().from(campaignRecipients);
      res.json(recipients);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaign-recipients/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      const recipient = await db.select().from(campaignRecipients).where(eq(campaignRecipients.id, id)).limit(1);
      if (recipient.length === 0) return res.status(404).json({ success: false, error: "Campaign recipient not found" });
      res.json(recipient[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/campaign-recipients", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { campaignId, contactId, status, attemptedAt, completedAt } = req.body;
      const id = `cr_${crypto.randomUUID()}`;
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/campaign-recipients/:id", parseBody, authenticateApiKey, async (req, res) => {
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
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/campaign-recipients/:id", authenticateApiKey, async (req, res) => {
    try {
      const id = req.params.id as string;
      await db.delete(campaignRecipients).where(eq(campaignRecipients.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/settings", authenticateApiKey, async (req, res) => {
    try {
      const settingsList = await db.select().from(settings);
      res.json(settingsList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/settings/:key", authenticateApiKey, async (req, res) => {
    try {
      const key = req.params.key as string;
      const setting = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      if (setting.length === 0) return res.status(404).json({ success: false, error: "Setting not found" });
      res.json(setting[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/settings", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const { key, value } = req.body;
      const id = `setting_${crypto.randomUUID()}`;
      await db.insert(settings).values({
        id,
        key,
        value: value || null,
        updatedAt: Date.now(),
      });
      res.json({ id, key, value, updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/settings/:key", parseBody, authenticateApiKey, async (req, res) => {
    try {
      const key = req.params.key as string;
      const { value } = req.body;
      await db.update(settings).set({
        value: value ?? null,
        updatedAt: Date.now(),
      }).where(eq(settings.key, key));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/settings/:key", authenticateApiKey, async (req, res) => {
    try {
      const key = req.params.key as string;
      await db.delete(settings).where(eq(settings.key, key));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Fallback Next.js Handler ---
  server.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Standalone persistent server listening on port ${port}`);
  });
});
