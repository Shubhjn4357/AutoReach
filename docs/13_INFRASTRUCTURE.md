# 13 Infrastructure & Hosting Specifications

## Service Mapping

| Component | Target Platform | Description |
| :--- | :--- | :--- |
| **Dashboard Frontend & Backend API** | Vercel or Railway | Next.js App Router (static & serverless routes) |
| **OpenWA Service** | Hugging Face Spaces or Railway | Dedicated service running Chrome/Puppeteer container |
| **Database** | Turso | Edge-replicated serverless libSQL / SQLite database |
| **Mobile Client** | Expo EAS | EAS Build and Submit pipeline for App Stores |

## Scaling Rules

- Turso scales dynamically and utilizes edge-replicated libSQL databases.
- The OpenWA service must be configured with a minimum of 2GB RAM (preferably 16GB, which Hugging Face Spaces provides for free) to allow stable Puppeteer/Chromium execution.

