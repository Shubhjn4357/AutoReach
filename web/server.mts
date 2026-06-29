import express from "express";
import next from "next";
import cors from "cors";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { verifyToken, JWTPayload } from "../shared/auth";

// Import custom services
import { apiKeyService } from "./services/apiKeyService";
import { WhatsAppManager } from "./services/whatsappManager";

// Import modular registers
import { registerAuthRoutes } from "./services/server/authRoutes";
import { registerWebhookRoutes } from "./services/server/webhookRoutes";
import { registerTemplateRoutes } from "./services/server/templateRoutes";
import { registerSessionRoutes } from "./services/server/sessionRoutes";
import { registerSyncRoutes } from "./services/server/syncRoutes";
import { registerInfraRoutes } from "./services/server/infraRoutes";
import { registerCampaignRoutes } from "./services/server/campaignRoutes";
import { startBackgroundScheduler } from "./services/server/scheduler";

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

  // Unified API key and JWT authentication middleware
  const authenticateApiKey: RequestHandler = async (req: AuthenticatedRequest, res: Response, nextFn: NextFunction) => {
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
      if (process.env.NODE_ENV === "production") {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Developer bypass is disabled in production" },
        });
      }
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

  // --- Register Modular Routes ---
  registerAuthRoutes(server, authenticateApiKey, parseBody);
  registerWebhookRoutes(server, authenticateApiKey, parseBody);
  registerTemplateRoutes(server, authenticateApiKey, parseBody);
  registerSessionRoutes(server, authenticateApiKey, parseBody);
  registerSyncRoutes(server, authenticateApiKey, parseBody);
  registerInfraRoutes(server, authenticateApiKey, parseBody);
  registerCampaignRoutes(server, authenticateApiKey, parseBody);

  // --- Start Background Task Scheduler Loops ---
  startBackgroundScheduler();

  // --- Fallback Next.js Handler ---
  server.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Standalone persistent server listening on port ${port}`);
  });
});
