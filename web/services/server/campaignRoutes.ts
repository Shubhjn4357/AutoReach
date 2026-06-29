import { Express, Request, Response, RequestHandler } from "express";
import { db } from "../../../shared/dbClient";
import { campaigns, campaignRecipients, messages } from "../../../shared/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function registerCampaignRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- Message Logs Endpoints ---
  server.get("/api/messages", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const messagesList = await db.select().from(messages);
      res.json(messagesList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/messages/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const message = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
      if (message.length === 0) return res.status(404).json({ success: false, error: "Message not found" });
      res.json(message[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/messages", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
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

  server.put("/api/messages/:id", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
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

  server.delete("/api/messages/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await db.delete(messages).where(eq(messages.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Campaigns Endpoints ---
  server.get("/api/campaigns", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const campaignsList = await db.select().from(campaigns);
      res.json(campaignsList);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaigns/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const campaign = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
      if (campaign.length === 0) return res.status(404).json({ success: false, error: "Campaign not found" });
      res.json(campaign[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/campaigns", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { name, messageTemplateId, messageBody, status, mediaUrl, scheduledAt, startedAt, finishedAt, recipients } = req.body;
      const id = `camp_${crypto.randomUUID()}`;
      await db.insert(campaigns).values({
        id,
        name,
        messageTemplateId: messageTemplateId || null,
        messageBody: messageBody || null,
        status: status || "draft",
        mediaUrl: mediaUrl || null,
        scheduledAt: scheduledAt || null,
        startedAt: startedAt || null,
        finishedAt: finishedAt || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // If recipients are provided, insert them in batch
      if (Array.isArray(recipients) && recipients.length > 0) {
        const batchValues = recipients.map((r: { phone: string; name?: string }) => ({
          id: `cr_${crypto.randomUUID()}`,
          campaignId: id,
          phone: r.phone,
          name: r.name || null,
          status: "pending",
        }));
        await db.insert(campaignRecipients).values(batchValues);
      }

      res.json({ id, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/campaigns/:id", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { name, messageTemplateId, messageBody, status, scheduledAt, startedAt, finishedAt } = req.body;
      await db.update(campaigns).set({
        name,
        messageTemplateId: messageTemplateId ?? null,
        messageBody: messageBody ?? null,
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

  server.delete("/api/campaigns/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await db.delete(campaigns).where(eq(campaigns.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  // --- Campaign Recipients Endpoints ---
  server.get("/api/campaign-recipients", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const recipients = await db.select().from(campaignRecipients);
      res.json(recipients);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.get("/api/campaign-recipients/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const recipient = await db.select().from(campaignRecipients).where(eq(campaignRecipients.id, id)).limit(1);
      if (recipient.length === 0) return res.status(404).json({ success: false, error: "Campaign recipient not found" });
      res.json(recipient[0]);
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.post("/api/campaign-recipients", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { campaignId, phone, name, status, attemptedAt, completedAt } = req.body;
      const id = `cr_${crypto.randomUUID()}`;
      await db.insert(campaignRecipients).values({
        id,
        campaignId,
        phone,
        name: name || null,
        status: status || "pending",
        attemptedAt: attemptedAt || null,
        completedAt: completedAt || null,
      });
      res.json({ id, ...req.body });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.put("/api/campaign-recipients/:id", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { campaignId, phone, name, status, attemptedAt, completedAt } = req.body;
      await db.update(campaignRecipients).set({
        campaignId,
        phone,
        name: name ?? null,
        status: status ?? "pending",
        attemptedAt: attemptedAt ?? null,
        completedAt: completedAt ?? null,
      }).where(eq(campaignRecipients.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  server.delete("/api/campaign-recipients/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await db.delete(campaignRecipients).where(eq(campaignRecipients.id, id));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: String(err) });
    }
  });
}
