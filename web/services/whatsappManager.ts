import makeWASocket, {
  DisconnectReason,
  BufferJSON,
  initAuthCreds,
  AuthenticationCreds,
  AuthenticationState,
  WASocket,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { db } from "../../shared/dbClient";
import { whatsappAuth, whatsappSessions, webhooks } from "../../shared/db";
import { eq, and, inArray } from "drizzle-orm";
import { BatchItem } from "drizzle-orm/batch";
import * as qrcode from "qrcode";
import { Boom } from "@hapi/boom";

// --- Drizzle Auth Store Adapter ---
export async function useDrizzleAuthState(sessionId: string): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  let creds: AuthenticationCreds;

  // Retrieve current creds
  const credsRow = await db
    .select()
    .from(whatsappAuth)
    .where(
      and(
        eq(whatsappAuth.sessionId, sessionId),
        eq(whatsappAuth.category, "creds"),
        eq(whatsappAuth.keyId, "creds")
      )
    )
    .limit(1);

  if (credsRow.length > 0) {
    creds = JSON.parse(credsRow[0].value, BufferJSON.reviver) as AuthenticationCreds;
  } else {
    creds = initAuthCreds();
    await db.insert(whatsappAuth).values({
      id: `${sessionId}:creds:creds`,
      sessionId,
      category: "creds",
      keyId: "creds",
      value: JSON.stringify(creds, BufferJSON.replacer),
      updatedAt: Date.now(),
    });
  }

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {};
          if (ids.length === 0) return data as { [id: string]: SignalDataTypeMap[T] };

          const rows = await db
            .select()
            .from(whatsappAuth)
            .where(
              and(
                eq(whatsappAuth.sessionId, sessionId),
                eq(whatsappAuth.category, type),
                inArray(whatsappAuth.keyId, ids)
              )
            );

          for (const row of rows) {
            data[row.keyId] = JSON.parse(row.value, BufferJSON.reviver);
          }
          return data as { [id: string]: SignalDataTypeMap[T] };
        },
        set: async (data: { [category: string]: { [id: string]: unknown } }) => {
          const batchOperations: BatchItem<"sqlite">[] = [];
          for (const category of Object.keys(data)) {
            for (const keyId of Object.keys(data[category])) {
              const value = data[category][keyId];
              const id = `${sessionId}:${category}:${keyId}`;

              if (value) {
                const serialized = JSON.stringify(value, BufferJSON.replacer);
                batchOperations.push(
                  db
                    .insert(whatsappAuth)
                    .values({
                      id,
                      sessionId,
                      category,
                      keyId,
                      value: serialized,
                      updatedAt: Date.now(),
                    })
                    .onConflictDoUpdate({
                      target: whatsappAuth.id,
                      set: {
                        value: serialized,
                        updatedAt: Date.now(),
                      },
                    })
                );
              } else {
                batchOperations.push(
                  db
                    .delete(whatsappAuth)
                    .where(
                      and(
                        eq(whatsappAuth.sessionId, sessionId),
                        eq(whatsappAuth.category, category),
                        eq(whatsappAuth.keyId, keyId)
                      )
                    )
                );
              }
            }
          }

          if (batchOperations.length > 0) {
            // Execute all operations in a single Turso HTTP request batch,
            // preventing the 'Database connections limit exceeded' error.
            await db.batch(batchOperations as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
          }
        },
      },
    },
    saveCreds: async () => {
      const serialized = JSON.stringify(creds, BufferJSON.replacer);
      await db
        .insert(whatsappAuth)
        .values({
          id: `${sessionId}:creds:creds`,
          sessionId,
          category: "creds",
          keyId: "creds",
          value: serialized,
          updatedAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: whatsappAuth.id,
          set: {
            value: serialized,
            updatedAt: Date.now(),
          },
        });
    },
  };
}

// --- WhatsApp Session Singleton Manager ---
export class WhatsAppManager {
  private static instance: WhatsAppManager | null = null;
  private sockets = new Map<string, WASocket>();
  private reconnectAttempts = new Map<string, number>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  public static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) {
      WhatsAppManager.instance = new WhatsAppManager();
    }
    return WhatsAppManager.instance;
  }

  /**
   * Safe initialization: resumes any previously connected sessions on boot.
   */
  public async init() {
    console.log("Initializing WhatsApp Manager...");
    try {
      // Find all sessions in DB that were previously connected/initializing
      const sessions = await db.select().from(whatsappSessions);
      for (const sess of sessions) {
        if (sess.status === "READY" || sess.status === "INITIALIZING" || sess.status === "QR_READY") {
          console.log(`Resuming session: ${sess.id}`);
          this.connect(sess.id).catch((err) => {
            console.error(`Failed to resume session ${sess.id}:`, err);
          });
        }
      }
    } catch (error) {
      console.error("Failed to query WhatsApp sessions on boot:", error);
    }
  }

  /**
   * Connect / Spin up a WhatsApp Baileys session
   */
  public async connect(sessionId: string): Promise<void> {
    if (this.sockets.has(sessionId)) {
      console.log(`Session ${sessionId} is already active.`);
      return;
    }

    console.log(`Connecting session ${sessionId}...`);
    await this.updateSessionStatus(sessionId, "INITIALIZING", null);

    try {
      const { state, saveCreds } = await useDrizzleAuthState(sessionId);

      // Create Baileys Socket
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        defaultQueryTimeoutMs: 60000,
        browser: ["AutoReach", "Chrome", "1.0.0"],
      });

      this.sockets.set(sessionId, sock);

      // Event: Credentials Update
      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });

      // Event: Messages Upsert
      sock.ev.on("messages.upsert", async (m) => {
        const { messages, type } = m;
        if (type !== "notify") return;
        for (const msg of messages) {
          const isFromMe = msg.key.fromMe;
          const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          const eventType = isFromMe ? "message.sent" : "message.received";
          await this.triggerWebhooks(sessionId, eventType, {
            id: msg.key.id,
            from: msg.key.remoteJid,
            to: isFromMe ? msg.key.remoteJid : sock.user?.id || sock.user?.name || "unknown",
            body,
            timestamp: msg.messageTimestamp,
          });
        }
      });

      // Event: Connection Update
      sock.ev.on("connection.update", async (update) => {
        const { connection, qr, lastDisconnect } = update;

        if (qr) {
          try {
            const qrDataUrl = await qrcode.toDataURL(qr);
            await this.updateSessionStatus(sessionId, "QR_READY", qrDataUrl);

            // Print ASCII QR code in terminal for easy local scanning/pairing
            console.log("\n==================================================");
            console.log(`> WhatsApp Pairing QR Code for Session: ${sessionId}`);
            console.log("==================================================");
            try {
              const qrTerminalText = await qrcode.toString(qr, { type: "terminal", small: true });
              console.log(qrTerminalText);
            } catch {
              console.log(`[QR Code String]: ${qr}`);
            }
            console.log("==================================================\n");
          } catch (err) {
            console.error(`Failed to render QR Code for ${sessionId}:`, err);
          }
        }

        if (connection === "open") {
          const phoneNumber = sock.user?.id ? sock.user.id.split(":")[0] : null;
          const pushName = sock.user?.name || null;
          
          this.reconnectAttempts.set(sessionId, 0);
          console.log(`WhatsApp Session [${sessionId}] linked successfully as ${phoneNumber}`);
          
          await db
            .insert(whatsappSessions)
            .values({
              id: sessionId,
              status: "READY",
              qrCode: null,
              phoneNumber,
              pushName,
              updatedAt: Date.now(),
            })
            .onConflictDoUpdate({
              target: whatsappSessions.id,
              set: {
                status: "READY",
                qrCode: null,
                phoneNumber,
                pushName,
                updatedAt: Date.now(),
              },
            });
        }

        if (connection === "close") {
          const error = lastDisconnect?.error as Boom | undefined;
          const statusCode = error?.output?.statusCode;
          const isQRTimeout = statusCode === 408 && !sock.user;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !isQRTimeout;

          console.log(
            `WhatsApp Session [${sessionId}] closed. Status code: ${statusCode}. Reconnectable: ${shouldReconnect} (QR Timeout: ${isQRTimeout})`
          );

          this.sockets.delete(sessionId);

          if (shouldReconnect) {
            this.scheduleReconnect(sessionId);
          } else {
            if (isQRTimeout) {
              console.log(`Session [${sessionId}] connection timed out (QR not scanned).`);
              await this.updateSessionStatus(sessionId, "DISCONNECTED", null);
            } else {
              console.log(`Session [${sessionId}] logged out permanently.`);
              await this.updateSessionStatus(sessionId, "DISCONNECTED", null);
              // Clean up session auth state from database
              await db.delete(whatsappAuth).where(eq(whatsappAuth.sessionId, sessionId));
            }
          }
        }
      });
    } catch (err) {
      console.error(`Error initializing Baileys socket for ${sessionId}:`, err);
      await this.updateSessionStatus(sessionId, "FAILED", null);
      throw err;
    }
  }

  /**
   * Disconnect session temporarily
   */
  public async disconnect(sessionId: string): Promise<void> {
    console.log(`Disconnecting WhatsApp Session [${sessionId}]`);
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    const sock = this.sockets.get(sessionId);
    if (sock) {
      sock.end(undefined);
      this.sockets.delete(sessionId);
    }
    await this.updateSessionStatus(sessionId, "DISCONNECTED", null);
  }

  /**
   * Log out session permanently (deletes credentials)
   */
  public async logout(sessionId: string): Promise<void> {
    console.log(`Logging out WhatsApp Session [${sessionId}]`);
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(sessionId);
    }

    const sock = this.sockets.get(sessionId);
    if (sock) {
      try {
        await sock.logout();
      } catch {
        sock.end(undefined);
      }
      this.sockets.delete(sessionId);
    }

    await this.updateSessionStatus(sessionId, "DISCONNECTED", null);
    // Delete all credentials from database
    await db.delete(whatsappAuth).where(eq(whatsappAuth.sessionId, sessionId));
  }

  /**
   * Check if a specific WhatsApp session is active and connected.
   */
  public isSessionConnected(sessionId: string): boolean {
    return this.sockets.has(sessionId);
  }

  /**
   * Send a Text message
   */
  public async sendTextMessage(sessionId: string, phone: string, text: string) {
    const sock = this.sockets.get(sessionId);
    if (!sock) {
      throw new Error(`WhatsApp Session [${sessionId}] is not connected.`);
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const recipient = `${cleanPhone}@s.whatsapp.net`;
    const response = await sock.sendMessage(recipient, { text });
    return { success: true, messageId: response?.key?.id };
  }

  /**
   * Send an Image message
   */
  public async sendImageMessage(sessionId: string, phone: string, imageUrl: string, caption: string) {
    const sock = this.sockets.get(sessionId);
    if (!sock) {
      throw new Error(`WhatsApp Session [${sessionId}] is not connected.`);
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const recipient = `${cleanPhone}@s.whatsapp.net`;
    
    // Fetch the media file
    const res = await fetch(imageUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch media file from: ${imageUrl}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());

    const response = await sock.sendMessage(recipient, {
      image: buffer,
      caption: caption,
    });
    return { success: true, messageId: response?.key?.id };
  }

  /**
   * Schedule reconnect with exponential backoff
   */
  private scheduleReconnect(sessionId: string) {
    const timer = this.reconnectTimers.get(sessionId);
    if (timer) return; // Reconnect already scheduled

    const attempts = this.reconnectAttempts.get(sessionId) || 0;
    this.reconnectAttempts.set(sessionId, attempts + 1);

    const delay = Math.min(30000, 1000 * Math.pow(2, attempts));
    console.log(`Scheduling reconnect for session [${sessionId}] in ${delay}ms (attempt ${attempts + 1})`);

    const timeout = setTimeout(() => {
      this.reconnectTimers.delete(sessionId);
      this.connect(sessionId).catch((err) => {
        console.error(`Reconnect attempt failed for session [${sessionId}]:`, err);
      });
    }, delay);

    this.reconnectTimers.set(sessionId, timeout);
  }

  /**
   * Helper to dispatch session status and message events to webhooks
   */
  private async triggerWebhooks(sessionId: string, eventType: string, data: unknown) {
    try {
      const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.sessionId, sessionId));
      for (const w of activeWebhooks) {
        if (w.active !== 1) continue;
        const eventsList = JSON.parse(w.events) as string[];
        if (eventsList.includes("*") || eventsList.includes(eventType)) {
          const payload = {
            event: eventType,
            sessionId,
            timestamp: Date.now(),
            data,
          };
          fetch(w.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch((err) => {
            console.warn(`Webhook failed for ${w.url}:`, err.message);
          });
        }
      }
    } catch (err) {
      console.error("Failed to trigger webhooks:", err);
    }
  }

  /**
   * Save status update helper
   */
  private async updateSessionStatus(sessionId: string, status: string, qrCode: string | null) {
    await db
      .insert(whatsappSessions)
      .values({
        id: sessionId,
        status,
        qrCode,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: whatsappSessions.id,
        set: {
          status,
          qrCode,
          updatedAt: Date.now(),
        },
      });

    // Dispatch status change events to webhooks
    await this.triggerWebhooks(sessionId, "session.status", { status: status.toLowerCase() });
    if (qrCode) {
      await this.triggerWebhooks(sessionId, "session.qr", { qrCode });
    }
  }
}
