# AutoReach

AutoReach is an offline-first, mobile-first CRM and business automation platform powered by local AI, structured integrations (WhatsApp, SMS, Google Drive), and automated sync queues.

## Directory Structure

This repository contains the following components:

- `web/`: Next.js web application providing the Admin Console (dashboard) and Backend API endpoints.
- `mobile/`: Expo React Native client application.
- `shared/`: Shared database schemas, auth validations, and service integration helpers.
- `docs/`: System blueprints and setup/deployment guides.

## Getting Started

1. **Install Dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Dev Environment**:
   - Start the Web Dashboard/API server:
     ```bash
     pnpm web:dev
     ```
   - Start the Expo Mobile bundler:
     ```bash
     pnpm mobile:start
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
- [12_BACKEND_ARCHITECTURE.md](docs/12_BACKEND_ARCHITECTURE.md) - Next.js APIs and Direct/Inline Integration flow
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
