import {
  API_BASE_ROUTE,
  type ApiKeySummary,
  type AuditLogSummary,
  type InfraConfig,
  type InfraStatus,
  type JsonObject,
  type MessageTemplateSummary,
  type PluginSummary,
  type SessionStats,
  type SessionSummary,
  type WebhookSummary,
  type WhatsAppSendResult,
  type WhatsAppStatus,
  getErrorMessage,
} from "../../../shared/api";

export { getErrorMessage };
export type {
  ApiKeySummary,
  AuditLogSummary,
  InfraConfig,
  InfraStatus,
  MessageTemplateSummary,
  PluginSummary,
  SessionStats,
  SessionSummary,
  WebhookSummary,
};

type SuccessResponse = { success: boolean; message?: string };
type ChatSummary = {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  timestamp: number;
  lastMessage: string;
};
type ChatMessage = {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: string;
  direction: string;
  status: string;
  createdAt: string;
};
type MessageListResponse = { messages: ChatMessage[]; total: number };
type QrResponse = { qrCode: string | null; status: string };
type CreatedApiKey = ApiKeySummary & { apiKey: string };

function getAuthHeaders(): Record<string, string> {
  const key = typeof window !== "undefined" ? window.sessionStorage.getItem("autoreach_api_key") : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_ROUTE}${path}`, { headers: getAuthHeaders(), ...opts });
  if (!res.ok) {
    const body = await res.json().catch((): JsonObject => ({}));
    throw new Error(getErrorMessage(body, `Request failed: ${res.status}`));
  }
  return res.json() as Promise<T>;
}

export const sessions = {
  list: () => apiFetch<SessionSummary[]>("/sessions"),
  get: (id: string) => apiFetch<SessionSummary>(`/sessions/${id}`),
  create: (name: string) => apiFetch<SessionSummary>("/sessions", { method: "POST", body: JSON.stringify({ name }) }),
  delete: (id: string) => apiFetch<SuccessResponse>(`/sessions/${id}`, { method: "DELETE" }),
  start: (id: string) => apiFetch<SuccessResponse>(`/sessions/${id}/start`, { method: "POST" }),
  stop: (id: string) => apiFetch<SuccessResponse>(`/sessions/${id}/stop`, { method: "POST" }),
  getQR: (id: string) => apiFetch<QrResponse>(`/sessions/${id}/qr`),
  getChats: (id: string) => apiFetch<ChatSummary[]>(`/sessions/${id}/chats`),
  getMessages: (id: string, chatId: string) =>
    apiFetch<MessageListResponse>(`/sessions/${id}/messages?chatId=${encodeURIComponent(chatId)}`),
  sendText: (id: string, chatId: string, text: string) =>
    apiFetch<WhatsAppSendResult>(`/sessions/${id}/messages/send-text`, {
      method: "POST",
      body: JSON.stringify({ chatId, text }),
    }),
  sendImage: (id: string, chatId: string, url: string, caption: string) =>
    apiFetch<WhatsAppSendResult>(`/sessions/${id}/messages/send-image`, {
      method: "POST",
      body: JSON.stringify({ chatId, url, caption }),
    }),
  stats: () => apiFetch<SessionStats>("/sessions/stats/overview"),
};

export const webhooks = {
  list: (sessionId?: string) =>
    sessionId ? apiFetch<WebhookSummary[]>(`/sessions/${sessionId}/webhooks`) : apiFetch<WebhookSummary[]>("/webhooks"),
  create: (sessionId: string, data: { url: string; events: string[]; secret?: string }) =>
    apiFetch<WebhookSummary>(`/sessions/${sessionId}/webhooks`, { method: "POST", body: JSON.stringify(data) }),
  update: (sessionId: string, id: string, data: Partial<Pick<WebhookSummary, "url" | "events" | "active">>) =>
    apiFetch<WebhookSummary>(`/sessions/${sessionId}/webhooks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (sessionId: string, id: string) =>
    apiFetch<SuccessResponse>(`/sessions/${sessionId}/webhooks/${id}`, { method: "DELETE" }),
  test: (sessionId: string, id: string) =>
    apiFetch<{ success: boolean; statusCode: number }>(`/sessions/${sessionId}/webhooks/${id}/test`, { method: "POST" }),
};

export const templates = {
  list: (sessionId?: string) =>
    sessionId
      ? apiFetch<MessageTemplateSummary[]>(`/sessions/${sessionId}/templates`)
      : apiFetch<MessageTemplateSummary[]>("/templates"),
  create: (sessionId: string, data: { name: string; body: string; header?: string; footer?: string }) =>
    apiFetch<MessageTemplateSummary>(`/sessions/${sessionId}/templates`, { method: "POST", body: JSON.stringify(data) }),
  delete: (sessionId: string, id: string) =>
    apiFetch<SuccessResponse>(`/sessions/${sessionId}/templates/${id}`, { method: "DELETE" }),
};

export const apiKeys = {
  list: () => apiFetch<ApiKeySummary[]>("/auth/api-keys"),
  create: (name: string, role?: string) =>
    apiFetch<CreatedApiKey>("/auth/api-keys", { method: "POST", body: JSON.stringify({ name, role }) }),
  delete: (id: string) => apiFetch<SuccessResponse>(`/auth/api-keys/${id}`, { method: "DELETE" }),
  revoke: (id: string) => apiFetch<SuccessResponse>(`/auth/api-keys/${id}/revoke`, { method: "POST" }),
};

export const auditLogs = {
  list: () => apiFetch<{ data: AuditLogSummary[]; total?: number }>("/audit"),
};

export const plugins = {
  list: () => apiFetch<PluginSummary[]>("/plugins"),
  enable: (id: string) => apiFetch<SuccessResponse>(`/plugins/${id}/enable`, { method: "POST" }),
  disable: (id: string) => apiFetch<SuccessResponse>(`/plugins/${id}/disable`, { method: "POST" }),
};

export const whatsapp = {
  status: () => apiFetch<WhatsAppStatus>("/whatsapp/status"),
  qr: () => apiFetch<{ qrCode: string | null }>("/whatsapp/qr"),
  connect: () => apiFetch<SuccessResponse>("/whatsapp/connect", { method: "POST" }),
  disconnect: () => apiFetch<SuccessResponse>("/whatsapp/disconnect", { method: "POST" }),
  logout: () => apiFetch<SuccessResponse>("/whatsapp/logout", { method: "POST" }),
  send: (phone: string, text: string, imageUrl?: string, caption?: string) =>
    apiFetch<WhatsAppSendResult>("/whatsapp/send", {
      method: "POST",
      body: JSON.stringify({ phone, text, imageUrl, caption }),
    }),
};

export const infra = {
  status: () => apiFetch<InfraStatus>("/infra/status"),
  config: () => apiFetch<InfraConfig>("/infra/config"),
  saveConfig: (data: InfraConfig) =>
    apiFetch<SuccessResponse>("/infra/config", { method: "PUT", body: JSON.stringify(data) }),
};

import { Lead, Task } from "../../../shared/types";
export type { Lead, Task };

export const crm = {
  listLeads: () => apiFetch<Lead[]>("/leads"),
  createLead: (data: Partial<Lead>) => apiFetch<Lead>("/leads", { method: "POST", body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) => apiFetch<SuccessResponse>(`/leads/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLead: (id: string) => apiFetch<SuccessResponse>(`/leads/${id}`, { method: "DELETE" }),
  listTasks: () => apiFetch<Task[]>("/tasks"),
  createTask: (data: Partial<Task>) => apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
};

export const api = { sessions, webhooks, templates, apiKeys, auditLogs, plugins, whatsapp, infra, crm };
export default api;
