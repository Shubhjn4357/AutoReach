import express from "express";
import next from "next";
import cors from "cors";
import { WhatsAppManager } from "./services/whatsappManager";
import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../shared/auth";
import { db } from "../shared/dbClient";
import { whatsappSessions } from "../shared/db";
import { eq } from "drizzle-orm";

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
  server.use(express.json({ limit: "50mb" }));
  server.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
  server.post("/api/whatsapp/connect", async (req, res) => {
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
  server.post("/api/whatsapp/disconnect", async (req, res) => {
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
  server.post("/api/whatsapp/logout", async (req, res) => {
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
  server.post("/api/whatsapp/send", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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

  server.post("/api/sendText", async (req, res) => {
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
  server.post("/api/sendImage", async (req, res) => {
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
  server.post("/send", async (req, res) => {
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

  // --- Fallback Next.js Handler ---
  server.all("*", (req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Standalone persistent server listening on port ${port}`);
  });
});
