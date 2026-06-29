import { Express, Request, Response, RequestHandler } from "express";
import { crmService } from "../crmService";
import { JWTPayload } from "../../../shared/auth";

interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

export function registerSyncRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- CRM Sync Endpoints ---
  server.get("/api/sync", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      return res.json({
        success: true,
        data: { campaigns: [] },
        timestamp: new Date().toISOString(),
      });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/sync", parseBody, authenticateApiKey, async (req: AuthenticatedRequest, res: Response) => {
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
}
