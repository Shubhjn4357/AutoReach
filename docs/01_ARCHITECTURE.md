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
  ┌──────┼──────────────────────────────┐
  │      │                              │
  ▼      ▼                              ▼
Turso  OpenWA                     Google Drive
  DB   Service
```

## Platform Architecture Layers

1. **Client Layer (Mobile)**:
   - Expo SDK running on React Native.
   - Core persistent storage in **Expo SQLite** with **Drizzle ORM** for local DB operations.
   - State management split between **Zustand** (global layout/navigation/auth state) and **TanStack Query** (server sync cache).
   - Local device access for Secure Store (tokens), SMS (sending gateway capability), and Notifications.

2. **Backend API Layer**:
   - Next.js API Routes and Route Handlers serving JSON payloads.
   - Uses Drizzle ORM to interface with the primary remote database.
   - High-latency tasks are processed synchronously/inline in route handlers.

3. **Database Layer (Primary Remote)**:
   - Hosted on Turso (libSQL). Edge-replicated database dialect matching our local SQLite schemas.

4. **Services Layer**:
   - **OpenWA Service**: Self-contained Node app hosted on Hugging Face Spaces or Railway acting as the WhatsApp Web automation controller.
