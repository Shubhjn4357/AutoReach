# 01 Architecture Specification

## Diagram

```
                    Expo Mobile
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
        ▼                ▼                 ▼
 SQLite + Drizzle   Expo Auth      Expo Notifications
        │
        ▼
     Next.js Backend
        │
 ┌──────┼───────────────┬──────────────┐
 │      │               │              │
 ▼      ▼               ▼              ▼
Neon   Redis        OpenWA       Google Drive
 DB     Queue         Service
```

## Platform Architecture Layers

1. **Client Layer (Mobile)**:
   - Expo SDK running on React Native.
   - Core persistent storage in **Expo SQLite** with **Drizzle ORM** for local DB operations.
   - State management split between **Zustand** (global layout/navigation/auth state) and **TanStack Query** (server sync cache).
   - Local device access for Secure Store (tokens), SMS (sending gateway capability), and Notifications.

2. **Integration / Cache Layer (Redis)**:
   - Redis manages background tasks, rate limiting, and temporary codes (OTP).
   - **BullMQ** schedules message operations, sync jobs, and notifications.

3. **Backend API Layer**:
   - Next.js API Routes and Route Handlers serving JSON payloads.
   - Uses Drizzle ORM to interface with the primary remote database.

4. **Database Layer (Primary Remote)**:
   - Hosted on Neon PostgreSQL.

5. **Services Layer**:
   - **OpenWA Service**: Self-contained Node app hosted on Railway acting as the WhatsApp Web automation controller.
   - **Worker Service**: Background node workers processing tasks from BullMQ.
   - **Scheduler**: Periodic cron trigger schedules.
