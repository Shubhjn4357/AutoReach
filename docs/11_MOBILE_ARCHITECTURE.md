# 11 Mobile Architecture Specifications

## App Directory Structure (`apps/mobile`)

Uses Expo Router (file-based navigation):

```
apps/mobile/
├── app/
│   ├── (auth)/            # Auth routes (Login, OAuth redirection)
│   ├── (tabs)/            # Bottom tab navigation screens
│   │   ├── index.tsx      # Dashboard / Leads overview
│   │   ├── crm/           # Pipelines & Contacts
│   │   ├── tasks/         # Calendar & Task checklists
│   │   └── settings/      # Configurations
│   └── _layout.tsx        # Base application controller
├── components/            # Mobile-specific layout components
├── hooks/                 # Custom React Native hooks
└── services/              # Local storage & sync queue triggers
```

## Data Management

- **Global UI State**: Zustand (stores theme preference, login credentials, token).
- **Server Cache & Querying**: TanStack Query (handles fetching remote configurations).
- **Local Persistent Data**: Expo SQLite with Drizzle ORM schemas.

## Offline Sync Engine

Every write action (create, update, delete) performs the following cycle:

1. **Local Commit**: Writes directly to SQLite and updates Zustand/Query local cache immediately (no spinner or block on UI).
2. **Enqueue Operation**: Adds the details (table, action type, payload data) into the SQLite sync queue.
3. **Background Sync Worker**: Activates periodically (or when network changes to online).
4. **API Push**: Reads queue and posts payloads sequentially to Next.js API endpoint.
5. **Conflict Resolution**: If backend rejects due to version mismatch, the client applies the server version and flags conflict details to the user.
6. **Dequeue**: Deletes the queue record upon receiving a successful status code from the server.
