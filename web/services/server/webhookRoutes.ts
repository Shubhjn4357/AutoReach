import { Express, Request, Response, RequestHandler } from "express";
import { webhookService } from "../webhookService";

export function registerWebhookRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- Webhooks Endpoints ---
  server.get("/api/webhooks", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const list = await webhookService.listAllWebhooks();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/webhooks", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId as string;
      const list = await webhookService.listSessionWebhooks(sessionId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId as string;
      const { url, events, secret } = req.body;
      const created = await webhookService.createWebhook(sessionId, url, events, secret);
      return res.json(created);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.put("/api/sessions/:sessionId/webhooks/:id", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { url, events, active } = req.body;
      await webhookService.updateWebhook(id, url, events, active);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/sessions/:sessionId/webhooks/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await webhookService.deleteWebhook(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sessions/:sessionId/webhooks/:id/test", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const resVal = await webhookService.testWebhook(id);
      return res.json(resVal);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
