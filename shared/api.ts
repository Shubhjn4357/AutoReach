export const API_BASE_ROUTE = "/api";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

export type SessionStatus = "ready" | "qr_ready" | "initializing" | "connected" | "disconnected" | "error" | string;

export interface SessionSummary {
  id: string;
  name?: string;
  status: SessionStatus;
  phone?: string | null;
  phoneNumber?: string | null;
  pushName?: string | null;
  qrCode?: string | null;
  updatedAt?: number;
}

export interface SessionStats {
  total?: number;
  active?: number;
  connected?: number;
  disconnected?: number;
  memoryUsage?: { heapUsed: number; heapTotal: number; external?: number; rss?: number };
}

export interface WebhookSummary {
  id: string;
  sessionId: string;
  url: string;
  events: string[];
  active: boolean | number;
}

export interface MessageTemplateSummary {
  id: string;
  sessionId: string;
  name: string;
  body: string;
  header?: string | null;
  footer?: string | null;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  role: string;
  isActive: boolean | number;
  apiKey?: string;
  usageCount?: number;
  expiresAt?: number | null;
}

export interface AuditLogSummary {
  id: string;
  action: string;
  severity: string;
  method?: string | null;
  path?: string | null;
  statusCode?: number | null;
  createdAt: number;
  errorMessage?: string | null;
    apiKeyId?: string | null;
    apiKeyName?: string | null;
    sessionId?: string | null;
    sessionName?: string | null;
    ipAddress?: string | null;
}

export interface PluginSummary {
  id: string;
  name: string;
  type: string;
  version?: string;
  status: "enabled" | "disabled" | "error" | string;
  description?: string;
}

export interface InfraStatus {
  database?: string;
  redis?: {
    connected?: boolean;
    host?: string;
    port?: number;
    mode?: string;
    enabled?: boolean;
  } | string;
  whatsapp?: string;
  [key: string]: JsonValue | undefined;
}

export interface InfraConfig {
  [key: string]: JsonValue | undefined;
}

export interface WhatsAppStatus {
  connected?: boolean;
  status?: string;
  phone?: string | null;
}

export interface WhatsAppSendResult {
  success?: boolean;
  messageId?: string;
  timestamp?: number;
}

export function getErrorMessage(error: unknown, fallback = "Request failed"): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}
