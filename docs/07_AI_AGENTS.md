# 07 AI Agent Specifications

## Architecture Principles

- **Highly Modular**: Each AI function must reside in its own module under `shared/`.
- **Stateless Execution**: Agents must not maintain persistent in-memory session states. All context (user data, historical messages, active schemas) must be explicitly fed as parameters to the execution call.
- **API-driven**: The mobile or dashboard application requests an operation via Next.js API routes (e.g. `/api/ai`), which processes the OpenAI or rule-based completion directly and returns the response payload.

## Modular Components

- **CRM Lead Scoring Agent** (`shared/ai.ts`): Processes lead profiles, scoring, and auto-enrichment, assigning grades and proposing immediate WhatsApp/SMS quick-reply text drafts.
- **Google Drive Integration**: Handles storage sync and metadata archiving for files.

## Error Resilience

- AI service calls should implement retry logic (max 3 attempts).
- Fallback mock/rule-based heuristics must be available to prevent client crashes and allow offline/local development without LLM API keys.

