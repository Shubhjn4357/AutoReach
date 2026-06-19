# 12 Backend Architecture Specifications

## App Directory Structure (`apps/api` and `apps/dashboard`)

```
apps/api/
├── app/
│   └── api/
│       ├── auth/
│       ├── leads/
│       ├── sync/
│       ├── whatsapp/
│       └── sms/
```

## Queue System (Redis + BullMQ)

- All async workflows (AI generations, batch messaging, pushes) are scheduled via **BullMQ**.
- **Workers Service** (`services/workers/`) listens to BullMQ channels:
  - `whatsapp_queue`: Batches outbound WhatsApp requests.
  - `sms_queue`: Formulates SMS payloads dispatched to target Android devices.
  - `notifications_queue`: Resolves and sends payloads to Expo Notification Servers.
  - `ai_queue`: Handles asynchronous LLM prompt evaluation.

## WhatsApp Integration (OpenWA)

- OpenWA is hosted as a dedicated Node service on Railway, isolated from the Next.js API.
- **Communication Flow**:
  - The Mobile Client talks to the Next.js API.
  - Next.js API puts a job in the Redis queue.
  - Workers fetch the job and send a POST request containing JSON payloads directly to the OpenWA service.
  - OpenWA drives WhatsApp Web via Puppeteer.

## SMS Architecture

- Cost-efficient Android SMS Gateway (MVP stage):
  - Next.js API sends a push notification containing the message text and recipient phone number to the user's Android phone.
  - The Android App (running as an SMS Gateway client) intercepts the push and uses the native SIM card to dispatch the SMS.
  - Status updates (Sent, Failed) are returned to the API callback url.
- An abstraction layer is maintained to support future upgrades to Twilio/MSG91.
