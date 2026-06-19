# 13 Infrastructure & Hosting Specifications

## Service Mapping

| Component | Target Platform | Description |
| :--- | :--- | :--- |
| **Dashboard Frontend** | Vercel | Next.js Static & Server Rendered Admin Dashboard |
| **Backend API** | Railway | Next.js API instance running Node runtime |
| **OpenWA Service** | Railway | Dedicated service running Chrome/Puppeteer container |
| **Worker Engine** | Railway | Node.js processes handling BullMQ queues |
| **Redis Cache** | Railway | Memory store for state, rate limit, and queues |
| **Database** | Turso | Serverless libSQL / SQLite database |
| **Mobile Client** | Expo EAS | EAS Build and Submit pipeline for App Stores |

## Scaling Rules

- Turso scales dynamically and utilizes edge-replicated libSQL databases.
- The OpenWA service must be configured with a minimum of 2GB RAM to allow stable Puppeteer/Chromium execution.
- BullMQ runs multiple worker threads depending on container resource metrics.
