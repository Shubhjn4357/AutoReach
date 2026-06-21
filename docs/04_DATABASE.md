# 04 Database Specifications

## Database Engine Mapping

- **Remote Database**: Turso (libSQL).
- **Local Database**: Expo SQLite.
- **ORM System**: Drizzle ORM.

## Architecture Guidelines

- The backend (Turso) and mobile client (Expo SQLite) share a unified SQLite-core schema. This eliminates the need for dialect conversions and ensures identical schema behavior.
- **Binary Files Policy**: Never store binary blobs directly in Turso or local SQLite. All document uploads must go to Google Drive (or future Object Storage solutions). Store only the `fileId` and relevant metadata (filename, filesize, mime-type, drive_url) inside the database.

## Sync Tables Architecture

To support the Offline-First, Sync-Later architecture, the local schema contains queue metadata:

```typescript
// Example sync queue table structure in SQLite
export const syncQueue = sqliteTable("sync_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  table: text("table").notNull(), // e.g. "leads", "tasks"
  operation: text("operation").notNull(), // "CREATE" | "UPDATE" | "DELETE"
  recordId: text("record_id").notNull(),
  payload: text("payload").notNull(), // JSON representation of the change
  createdAt: integer("created_at").notNull(),
  attempts: integer("attempts").default(0),
});
```

## Migration Commands

- Drizzle kit is utilized to compile schemas into migrations:
  - Generate libSQL/SQLite migrations: `drizzle-kit generate`
  - Push SQLite/libSQL changes directly (for dev): `drizzle-kit push`
- Local mobile schema checks for DB version at startup and applies migrations before rendering the UI.
