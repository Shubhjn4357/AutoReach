# AutoReach Monorepo

AutoReach is an offline-first, mobile-first CRM and business automation platform powered by local AI, structured integrations (WhatsApp, SMS, Google Drive), and automated sync queues.

## Directory Structure

This monorepo utilizes **Turborepo** + **pnpm workspaces**:

- `apps/`
  - `mobile/`: Expo React Native client application.
  - `dashboard/`: Next.js admin frontend.
  - `api/`: Next.js backend API routing.
- `packages/`: Shareable workspace modules.
  - `ui/`: Core design system components.
  - `db/`: Database schemas, migrations, and client wrapper (Drizzle ORM for Turso & SQLite).
  - `auth/`: Google OAuth & JWT authentication helpers.
  - `ai/`: Modular, stateless AI agent helpers.
  - `whatsapp/`: OpenWA interface wrappers.
  - `sms/`: Android SMS Gateway wrapper/adapters.
  - `notifications/`: Push notification handlers.
  - `drive/`: Google Drive API integration.
  - `redis/`: Redis client and helper queues (BullMQ).
  - `analytics/`: Business analytics computations.
  - `calendar/`: Google / local calendar sync.
  - `crm/`: Core lead/customer relationship business logic.
  - `shared/`: Shared utilities, types, config.
- `services/`: Specialized microservices.
  - `openwa/`: Dedicated Railway service hosting the WhatsApp Web bridge.
  - `workers/`: Background queue processing jobs.
  - `scheduler/`: Event and cron scheduling.

## Getting Started

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Dev Environment**:
   ```bash
   pnpm dev
   ```

3. **Build All Apps**:
   ```bash
   pnpm build
   ```

## Development Standards

Please refer to the `docs/` folder for comprehensive blueprints and specifications:
- [00_PROJECT_VISION.md](docs/00_PROJECT_VISION.md) - Vision and Core Platform Purpose
- [01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) - Technical Architecture Mapping
- [02_TECH_STACK.md](docs/02_TECH_STACK.md) - Technologies list
- [03_MONOREPO.md](docs/03_MONOREPO.md) - Monorepo management guidelines
- [04_DATABASE.md](docs/04_DATABASE.md) - Turso libSQL + Expo SQLite Schema Rules
- [05_API.md](docs/05_API.md) - Next.js endpoints & validation rules
- [06_AUTH.md](docs/06_AUTH.md) - Google OAuth & Session state
- [07_AI_AGENTS.md](docs/07_AI_AGENTS.md) - AI Agent architecture and specifications
- [08_UI_DESIGN_SYSTEM.md](docs/08_UI_DESIGN_SYSTEM.md) - Spatial UI Design philosophy
- [09_DESIGN_TOKENS.md](docs/09_DESIGN_TOKENS.md) - Shared design tokens
- [10_COMPONENT_LIBRARY.md](docs/10_COMPONENT_LIBRARY.md) - UI package primitives
- [11_MOBILE_ARCHITECTURE.md](docs/11_MOBILE_ARCHITECTURE.md) - Expo client structure
- [12_BACKEND_ARCHITECTURE.md](docs/12_BACKEND_ARCHITECTURE.md) - Next.js APIs, BullMQ, Redis configs
- [13_INFRASTRUCTURE.md](docs/13_INFRASTRUCTURE.md) - Hosting specifications (Vercel, Railway, Turso)
- [14_SECURITY.md](docs/14_SECURITY.md) - Encryption, OAuth scopes, secure storage rules
- [15_CODE_STANDARDS.md](docs/15_CODE_STANDARDS.md) - Coding rules & ESLint/Prettier setup
- [16_TESTING.md](docs/16_TESTING.md) - Testing architecture
- [17_DEPLOYMENT.md](docs/17_DEPLOYMENT.md) - CI/CD and deployment procedures
- [18_ROADMAP.md](docs/18_ROADMAP.md) - Feature implementation stages
- [19_SETUP_GUIDE.md](docs/19_SETUP_GUIDE.md) - Setup & Installation Instructions

## Quick Start

1. **Install packages**: `pnpm install`
2. **Setup environment variables**: configure `.env` based on template.
3. **Push schemas**: `npx drizzle-kit push`
4. **Run dev servers**:
   - Web console: `pnpm web:dev`
   - Mobile Expo client: `pnpm mobile:start`
