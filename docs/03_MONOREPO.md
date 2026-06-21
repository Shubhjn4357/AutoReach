# 03 Monorepo Specifications

## Layout and Structure

This repository is structured as a consolidated project containing the mobile application, web application, and shared modules:

```
root/
├── docs/               # System and architecture design specifications
├── mobile/             # Expo React Native App (for mobile sales/leads)
├── web/                # Next.js Dashboard and API Route Handlers
├── shared/             # Shared database models, OAuth, and integration helpers
├── package.json        # Root configurations and scripts
├── drizzle.config.ts   # Database schema configurations for Drizzle Kit
└── tsconfig.json       # Root TypeScript configuration
```

## Shared Code Usage

Shared code is located in the `shared/` directory at the root of the project. Instead of publishing package workspaces, the web application (`web/`) and mobile application (`mobile/`) import shared models and functions using direct relative paths:

```typescript
import { verifyToken } from "../../../../shared/auth";
import { db } from "../../../../shared/dbClient";
import { leads } from "../../../../shared/db";
```

## Build Orchestration

Root-level scripts in `package.json` let you start or build target platforms:

- `pnpm web:dev` - Starts the Next.js local development server.
- `pnpm web:build` - Compiles the Next.js production build.
- `pnpm mobile:start` - Starts the Expo development bundler.
- `pnpm lint` - Runs static code checking.
