# 18 Product Roadmap & Milestones

## Phase 1: Foundation (MVP)

- Establish monorepo workspace packages (`@autoreach/ui`, `@autoreach/db`, `@autoreach/shared`).
- Implement Google OAuth sign-in flow.
- Setup local Expo SQLite databases and basic Next.js API sync routes.
- Integrate cost-efficient Android SMS Gateway client interface.
- Deploy basic OpenWA WhatsApp message bridge.

## Phase 2: CRM & AI Automations

- Expand SQLite schema to support lead pipelines, activities, and task checklists.
- Build the local sync queue engine with exponential backoff retries.
- Deploy the modular AI Agent pipeline (`packages/ai`):
  - Proactive notification triggers.
  - Automated quick-replies drafts.
- Configure dashboard tables, charts, and team filters.

## Phase 3: Cloud Drive & Enterprise Upgrades

- Enable direct Google Drive OAuth media sync (storing metadata in PostgreSQL).
- Integrate paid message gateways adapters (Twilio, MSG91) as fallback channels.
- Implement Role-Based Access Control (RBAC) schemas to support Teams and Organizations.
- Build usage billing, SaaS subscriptions, and tenant onboarding structures.
