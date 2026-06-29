import { Express, Request, Response, RequestHandler } from "express";
import { apiKeyService } from "../apiKeyService";
import { auditService } from "../auditService";
import { verifyGoogleToken, signToken } from "../../../shared/auth";

export function registerAuthRoutes(
  server: Express,
  authenticateApiKey: RequestHandler,
  parseBody: RequestHandler[]
) {
  // --- Express Login Endpoint ---
  server.post("/api/auth/login", parseBody, async (req: Request, res: Response) => {
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
  server.post("/api/auth/google", parseBody, async (req: Request, res: Response) => {
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

  // --- API Credentials Endpoints ---
  server.get("/api/auth/api-keys", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const list = await apiKeyService.listKeys();
      return res.json(list);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/auth/api-keys", parseBody, authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const { name, role, expiresAt } = req.body;
      const key = await apiKeyService.createKey(name, role, expiresAt);
      return res.json(key);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.delete("/api/auth/api-keys/:id", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await apiKeyService.deleteKey(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });

  server.post("/api/auth/api-keys/:id/revoke", authenticateApiKey, async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      await apiKeyService.revokeKey(id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}
