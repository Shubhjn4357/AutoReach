# 14 Security Specifications

## Principles

1. **Secrets Location**: All API keys, credentials (Google client secrets, OpenWA configurations), and decryption keys must reside strictly on the backend environments. They must never be bundled into the Expo Mobile build.
2. **Encryption**: All transit communications must utilize HTTPS. JWT credentials are encrypted using SHA-256 signatures.
3. **Storage**:
   - Expo Secure Store is used to store the application JWT on the mobile client.
   - Credentials for Google API access (OAuth refresh tokens) must be stored in Neon PostgreSQL, encrypted at rest.

## Countermeasures

- **Rate Limiting**: Applied at Next.js gateway level utilizing Redis token bucket algorithm (e.g. max 100 requests per minute per IP address).
- **SQL Injection**: Prevented by utilizing parameterized inputs generated through Drizzle ORM compile functions.
- **Input Sanitization**: All incoming data objects must pass through Zod validations matching exact schema types.
- **Cross-Site Scripting (XSS)**: Next.js frontend pages must avoid unsafe DOM rendering (`dangerouslySetInnerHTML`) unless processing validated markdown from the AI Agent.
