import { Express, Request, Response, RequestHandler } from "express";
import { templateService } from "../templateService";

export function registerTemplateRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- Message Templates Endpoints ---
  server.get("/api/templates", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const list = await templateService.listTemplates();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.get("/api/sessions/:sessionId/templates", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId as string;
      const list = await templateService.listTemplates(sessionId);
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/templates", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { sessionId, name, body, header, footer } = req.body;
      const template = await templateService.createTemplate(sessionId, name, body, header, footer);
      return res.json(template);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/templates/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await templateService.deleteTemplate(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
