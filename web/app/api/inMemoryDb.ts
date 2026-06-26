import type { Lead, Task } from "../../../shared/types";

export const leadsInMemoryDb = new Map<string, Lead>();
export const tasksInMemoryDb = new Map<string, Task>();
