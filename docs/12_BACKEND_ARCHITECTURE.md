# 12 Backend Architecture Specifications

## App Directory Structure (`web/app/api`)

```
web/app/api/
├── auth/
│   └── google/
│       └── route.ts
├── leads/
│   └── route.ts
├── sync/
│   └── route.ts
├── tasks/
│   └── route.ts
├── drive/
│   └── route.ts
├── whatsapp/
│   └── route.ts
├── sms/
│   └── route.ts
└── ai/
    └── route.ts
```

## Synchronous / Direct Backend Execution

- Rather than using a multi-service message queue model, high-latency external service calls (such as OpenAI completions, Google Drive uploads, and sending notifications) are executed **inline/directly** within the Next.js API route handlers.
- This ensures maximum architectural simplicity and compatibility with standard cloud platforms and serverless hobby tiers (like Vercel and Railway's single-service containers).

## WhatsApp Integration (OpenWA)

- OpenWA is hosted as an isolated Docker service on Hugging Face Spaces or Railway.
- **Communication Flow**:
  - The client (Mobile or Dashboard) requests a WhatsApp automated action by POSTing to `/api/whatsapp`.
  - The Next.js API handler receives the request and directly performs a POST request containing the JSON payload to the `OPENWA_API_URL`.
  - OpenWA drives WhatsApp Web via Puppeteer.

## SMS Architecture

- Cost-efficient Android SMS Gateway (MVP stage):
  - Next.js API sends a push notification containing the message text and recipient phone number to the user's Android phone.
  - The Android App (running as an SMS Gateway client) intercepts the push and uses the native SIM card to dispatch the SMS.
  - Status updates (Sent, Failed) are returned to the API callback URL.
- An abstraction layer is maintained in `shared/sms.ts` to support future upgrades to Twilio/MSG91.

