# 17 Deployment & Release Specifications

## Build & Release Pipeline

All code changes pushed to the `main` branch trigger automated deployments via GitHub Actions:

1. **Linting & Formatting Validation**: Runs Prettier and ESLint.
2. **Build Checking**: Compiles all Next.js applications and packages.
3. **Automated Deployments**:
   - **Vercel**: Deploys `apps/dashboard`.
   - **Railway**: Deploys `apps/api`, `services/openwa`, and `services/workers`.
   - **Expo EAS**: Compiles OTA (Over-the-Air) updates or app store binaries depending on whether native project modules changed.

## Required Environment Variables

Ensure the following variables are configured in production:

### Railway (API & Workers)
- `DATABASE_URL`: Connection string for Neon PostgreSQL.
- `REDIS_URL`: Connection string for Redis.
- `JWT_SECRET`: Token hashing key.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: OAuth verification parameters.
- `OPENWA_API_URL`: URL of the isolated OpenWA service container.

### Vercel (Dashboard)
- `NEXT_PUBLIC_API_URL`: Target Railway API address.
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: OAuth identifier.
