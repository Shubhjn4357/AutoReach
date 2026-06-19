# 07 AI Agent Specifications

## Architecture Principles

- **Highly Modular**: Each AI function must reside in its own package/module under `packages/ai`.
- **Stateless Execution**: Agents must not maintain persistent in-memory session states. All context (user data, historical messages, active schemas) must be explicitly fed as parameters to the execution call.
- **Queue-driven**: High-latency AI calls must execute asynchronously. The mobile or dashboard application requests an operation, which gets pushed onto the Redis/BullMQ AI Queue, processed by a worker, and returned via WebSockets or Push Notifications.

## Modular Components

- **CRM Agent**: Processes lead profiles, scoring, and auto-enrichment.
- **Sales Agent**: Handles product catalog recommendations and deal pipeline adjustments.
- **Reminder Agent**: Decides when and how (SMS, WhatsApp, Email) to alert the user/customer.
- **Email Agent**: Drafts contextual emails based on deal state.
- **WhatsApp Agent & SMS Agent**: Parsers that inspect incoming texts and propose immediate quick replies.
- **Analytics Agent**: Runs calculations and structures reports from Neon DB logs.
- **Calendar & Scheduler Agent**: Formulates cron expressions and books Google Calendar slots.
- **Knowledge Agent**: Performs vector searches across uploaded company documentation.
- **Workflow Agent**: Maps conditions to automated actions (e.g. "If lead is cold for 7 days, trigger WhatsApp notification").

## Error Resilience

- AI service calls should implement retry logic (max 3 attempts).
- Fallback mock responses must be available to prevent client crashes in case LLM APIs are offline.
