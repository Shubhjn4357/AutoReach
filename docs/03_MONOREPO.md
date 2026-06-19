# 03 Monorepo Specifications

## Layout and Workspaces

This repository is structured as a Turborepo monorepo with `pnpm` workspaces:

```
root/
├── apps/
│   ├── mobile/         # Expo React Native App
│   ├── dashboard/      # Next.js Dashboard App
│   └── api/            # Next.js API Routes / Backend App
├── packages/
│   ├── ui/             # Reusable Design Primitives
│   ├── db/             # Shared Neon PostgreSQL & Expo SQLite Schema definition
│   ├── auth/           # Shared token validation and Google Sign-In logic
│   ├── ai/             # Stateless AI agent adapters
│   ├── whatsapp/       # WhatsApp payload definitions & API helpers
│   ├── sms/            # SMS gateway triggers
│   ├── notifications/  # Expo Push payload formatters
│   ├── drive/          # Google Drive file upload/metadata handlers
│   ├── redis/          # BullMQ & caching configurations
│   ├── shared/         # General utility functions
│   ├── hooks/          # React Native/Web shared hook primitives
│   ├── types/          # TypeScript shared interface schemas
│   └── config/         # Shared tailwind, eslint, and typescript configs
├── services/
│   ├── openwa/         # OpenWA instance container configurations
│   ├── workers/        # BullMQ background task processor
│   └── scheduler/      # Cron-job configurations
```

## Adding Workspace Dependencies

- Do not use absolute import paths outside the package.
- To link one workspace package to another, add the target package in the destination `package.json`'s dependencies:
  ```json
  "dependencies": {
    "@autoreach/db": "workspace:*"
  }
  }
  ```
- Always run `pnpm install` from the root directory.

## Build Orchestration (Turborepo)

- Turborepo is configured via the root `turbo.json`.
- Caches build output to speed up CI/CD runs.
- Tasks are executed using:
  - `pnpm dev` - Parallel local development servers.
  - `pnpm build` - Parallel production compiling.
  - `pnpm lint` - Static analysis runs.
