# 17 Deployment & Release Specifications

## Build & Release Pipeline

All code changes pushed to the `main` branch trigger automated workflows or deployments:

1. **Linting & Formatting Validation**: Runs Prettier and ESLint.
2. **Build Checking**: Compiles the Next.js web application.
3. **Automated Deployments**:
   - **Vercel** or **Railway**: Deploys the Next.js application (`web/`).
   - **Expo EAS**: Compiles OTA (Over-the-Air) updates or standalone app store binaries depending on whether native project modules changed.

## Required Environment Variables

Ensure the following variables are configured in production for the Next.js service (`web/`):

### Next.js API & Dashboard (Vercel or Railway)

- `DATABASE_URL`: Connection string for Turso Database (`libsql://...`).
- `DATABASE_AUTH_TOKEN`: Auth token for Turso.
- `JWT_SECRET`: Token hashing key.
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: Google OAuth verification credentials.
- `OPENWA_API_URL`: URL of the isolated OpenWA service container (e.g. Hugging Face Space URL).
- `EXPO_PUBLIC_API_URL`: Target deployment URL of the API.
