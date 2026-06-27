import { db } from "../../shared/dbClient";
import { whatsappSessions, whatsappAuth, leads, messages } from "../../shared/db";
import { eq } from "drizzle-orm";
import { WhatsAppManager } from "./whatsappManager";

export const sessionService = {
  listSessions: async () => {
    const list = await db.select().from(whatsappSessions);
    return list.map(s => ({
      id: s.id,
      name: s.id,
      status: s.status.toLowerCase(),
      phone: s.phoneNumber,
      pushName: s.pushName,
      createdAt: new Date(s.updatedAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    }));
  },

  getStats: async () => {
    const list = await db.select().from(whatsappSessions);
    const readyCount = list.filter(s => s.status === "READY").length;
    return {
      total: list.length,
      active: readyCount,
      ready: readyCount,
      disconnected: list.length - readyCount,
      byStatus: {
        ready: readyCount,
        disconnected: list.length - readyCount,
      },
      memoryUsage: process.memoryUsage(),
    };
  },

  getSessionById: async (id: string) => {
    const rows = await db.select().from(whatsappSessions).where(eq(whatsappSessions.id, id)).limit(1);
    if (rows.length === 0) return null;
    const s = rows[0];
    return {
      id: s.id,
      name: s.id,
      status: s.status.toLowerCase(),
      phone: s.phoneNumber,
      pushName: s.pushName,
      createdAt: new Date(s.updatedAt).toISOString(),
      updatedAt: new Date(s.updatedAt).toISOString(),
    };
  },

  createSession: async (name: string) => {
    const sessionId = name.toLowerCase().replace(/\s+/g, "-");
    await db.insert(whatsappSessions).values({
      id: sessionId,
      status: "DISCONNECTED",
      qrCode: null,
      phoneNumber: null,
      pushName: null,
      updatedAt: Date.now(),
    });
    return {
      id: sessionId,
      name: sessionId,
      status: "disconnected",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  deleteSession: async (id: string) => {
    const waManager = WhatsAppManager.getInstance();
    await waManager.disconnect(id).catch(() => {});
    await db.delete(whatsappSessions).where(eq(whatsappSessions.id, id));
    await db.delete(whatsappAuth).where(eq(whatsappAuth.sessionId, id));
  },

  startSession: async (id: string) => {
    const waManager = WhatsAppManager.getInstance();
    await waManager.connect(id);
  },

  stopSession: async (id: string) => {
    const waManager = WhatsAppManager.getInstance();
    await waManager.disconnect(id);
  },

  forceKillSession: async (id: string) => {
    const waManager = WhatsAppManager.getInstance();
    await waManager.disconnect(id).catch(() => {});
    await db.update(whatsappSessions).set({ status: "DISCONNECTED", qrCode: null }).where(eq(whatsappSessions.id, id));
  },

  getQR: async (id: string) => {
    const rows = await db.select().from(whatsappSessions).where(eq(whatsappSessions.id, id)).limit(1);
    if (rows.length === 0) return null;
    return { qrCode: rows[0].qrCode, status: rows[0].status.toLowerCase() };
  },

  getChats: async () => {
    const activeLeads = await db.select().from(leads);
    return activeLeads.map(l => ({
      id: l.phone ? `${l.phone.replace(/\D/g, "")}@s.whatsapp.net` : `${l.id}@s.whatsapp.net`,
      name: l.name,
      isGroup: false,
      unreadCount: 0,
      timestamp: l.updatedAt || Date.now(),
      lastMessage: l.notes || "Lead registered in CRM",
    }));
  },

  getMessages: async (chatId: string) => {
    const cleanChatPhone = chatId.split("@")[0];
    const matchingLeads = await db.select().from(leads);
    const lead = matchingLeads.find(l => l.phone && l.phone.replace(/\D/g, "") === cleanChatPhone);
    
    const dbMessages = await db.select().from(messages).where(eq(messages.chatId, chatId)).orderBy(messages.timestamp);

    const mappedDbMessages = dbMessages.map(m => ({
      id: m.id,
      chatId: m.chatId,
      from: m.fromMe === 1 ? "me" : m.sender || "other",
      to: m.chatId,
      body: m.body || "",
      type: m.type,
      direction: m.fromMe === 1 ? "outgoing" : "incoming",
      status: "read",
      createdAt: new Date(m.timestamp * 1000).toISOString(),
    }));

    const welcomeMsg = {
      id: `msg_init_${cleanChatPhone}`,
      chatId: chatId,
      from: "me",
      to: chatId,
      body: lead ? `Hello ${lead.name}, welcome to AutoReach! How can we help you today?` : "Hello! Welcome to AutoReach.",
      type: "text",
      direction: "outgoing",
      status: "read",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };

    return { messages: [welcomeMsg, ...mappedDbMessages], total: mappedDbMessages.length + 1 };
  }
};
export default sessionService;
