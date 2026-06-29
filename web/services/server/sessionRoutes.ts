import { Express, Request, Response, RequestHandler } from "express";
import { sessionService } from "../sessionService";
import { WhatsAppManager } from "../whatsappManager";
import { JWTPayload } from "../../../shared/auth";

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function registerSessionRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  const waManager = WhatsAppManager.getInstance();

  // --- WhatsApp Sessions Default Status Endpoints ---
  server.get("/api/whatsapp/status", authenticateApiKey, async (req: Request, res: Response) => {
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

  server.get("/api/whatsapp/qr", authenticateApiKey, async (req: Request, res: Response) => {
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

  server.post("/api/whatsapp/connect", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      await sessionService.startSession("default");
      return res.json({ success: true, message: "Connection loop initiated" });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/disconnect", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      await sessionService.stopSession("default");
      return res.json({ success: true, message: "Disconnected successfully" });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.post("/api/whatsapp/logout", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
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
  server.post("/api/sendText", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
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

  server.post("/api/sendImage", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
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

  server.post("/send", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) return res.status(400).json({ success: false, error: "Missing phone or message" });
      const result = await waManager.sendTextMessage("default", phone, message);
      return res.json({ success: true, id: result.messageId });
    } catch (error: unknown) {
      return res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // --- OpenWA Multi-Session Endpoints ---
  server.get("/api/sessions", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const list = await sessionService.listSessions();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/stats/overview", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const stats = await sessionService.getStats();
      return res.json(stats);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const details = await sessionService.getSessionById(id);
      if (!details) return res.status(404).json({ success: false, error: "Session not found" });
      return res.json(details);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const created = await sessionService.createSession(req.body.name);
      return res.json(created);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/sessions/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await sessionService.deleteSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/start", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await sessionService.startSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/stop", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await sessionService.stopSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:id/force-kill", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await sessionService.forceKillSession(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/qr", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const qr = await sessionService.getQR(id);
      if (!qr) return res.status(404).json({ success: false, error: "Session not found" });
      return res.json(qr);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/chats", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const list = await sessionService.getChats();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:id/messages", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const msgs = await sessionService.getMessages(String(req.query.chatId));
      return res.json(msgs);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/messages/send-text", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { chatId, text } = req.body;
      const cleanPhone = chatId.split("@")[0];
      const result = await waManager.sendTextMessage(req.params.sessionId as string, cleanPhone, text);
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/messages/send-image", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { chatId, url, caption } = req.body;
      const cleanPhone = chatId.split("@")[0];
      const result = await waManager.sendImageMessage(req.params.sessionId as string, cleanPhone, url, caption || "");
      return res.json({ messageId: result.messageId, timestamp: Date.now() });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
