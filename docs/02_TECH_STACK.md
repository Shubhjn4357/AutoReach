# 02 Tech Stack

The technology stack is unified to minimize contextual overhead and promote shared utilities:

## Mobile (Expo React Native)
- **Framework**: Expo SDK, React Native, Expo Router.
- **Languages**: TypeScript (Strict Mode).
- **Data Querying**: React Query (TanStack Query) + Zustand.
- **Local DB**: Expo SQLite + Drizzle ORM.
- **Security**: Expo Secure Store.
- **Push Notifications**: Expo Notifications.
- **Authentication**: Expo Auth Session (Google OAuth client).

## Web (Next.js Admin Dashboard)
- **Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS, shadcn/ui.
- **State Management**: React Query, Zustand.

## Backend (Next.js API & Services)
- **Framework**: Next.js API Routes / Route Handlers, Node.js.
- **Database ORM**: Drizzle ORM (PostgreSQL driver).
- **Authentication**: JWT token verify and session management.
- **Caching & Queuing**: Redis, BullMQ.
- **Workers**: Dedicated Railway node service + Cron workers.

## External integrations
- **WhatsApp**: OpenWA hosted on Railway.
- **SMS**: Android Gateway (MVP) with future plans for Twilio, MSG91, TextLocal.
- **Cloud Drive**: Google Drive API (via same OAuth credentials).
- **Push Delivery**: Expo Push Service.
