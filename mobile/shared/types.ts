export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "WON";
export type TaskStatus = "PENDING" | "COMPLETED";

export interface User {
  id: string;
  email: string;
  name: string | null;
  googleId: string | null;
  createdAt: Date | number;
}

export interface Lead {
  id: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  value: number;
  notes: string | null;
  createdAt: Date | number;
  updatedAt: Date | number;
}

export interface Task {
  id: string;
  userId: string | null;
  leadId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | number | null;
  createdAt: Date | number;
}

export interface SyncOperation {
  id: number;
  table: "leads" | "tasks";
  operation: "CREATE" | "UPDATE" | "DELETE";
  recordId: string;
  payload: string; // JSON string payload
  createdAt: number;
  attempts?: number;
}

export interface SyncBatchRequest {
  operations: Omit<SyncOperation, "id">[];
}

export interface SyncBatchResponse {
  success: boolean;
  syncedIds: string[];
  errors?: { recordId: string; error: string }[];
}
