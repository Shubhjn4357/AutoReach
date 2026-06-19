# 19 AutoReach Setup & Installation Guide

This guide provides step-by-step instructions to set up, configure, and run the AutoReach CRM and business automation platform locally.

---

## Prerequisites

Before starting, ensure you have the following installed on your system:
- **Node.js**: `v20.x` or higher
- **pnpm**: `v8.x` or higher
- **Git**: (Optional, for version tracking)

---

## Step 1: Install Dependencies

Clone the repository and run the install command from the root directory:
```bash
pnpm install
```

---

## Step 2: Environment Configurations (`.env`)

Create or update the `.env` file in the root directory. Configure the following variables:

```ini
# Turso Database Connection (libSQL)
DATABASE_URL="libsql://your-database-name.turso.io"
DATABASE_AUTH_TOKEN="your-turso-auth-token"

# JWT token signing secret (for custom application auth)
JWT_SECRET="your-secure-production-jwt-token-signing-key"

# Google OAuth Credentials (Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-oauth-client-id-here"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret-here"

# Redis Cache & Message queues (BullMQ)
REDIS_URL="redis://username:password@redis-host.com:6379"

# Local mobile client API URL
EXPO_PUBLIC_API_URL="http://localhost:3000"
```

---

## Step 3: Database setup (Migrations)

Generate and push Drizzle schema definitions to Turso:

1. **Compile database schemas**:
   ```bash
   npx drizzle-kit generate
   ```
2. **Apply migrations**:
   Push the changes directly to your remote Turso database instance:
   ```bash
   npx drizzle-kit push
   ```

---

## Step 4: Run Dev Servers

You can launch both backend and mobile client development services from the root folder:

1. **Start Next.js Backend & Dashboard** (runs on port `3000`):
   ```bash
   pnpm web:dev
   ```

2. **Start Expo Mobile Bundler**:
   ```bash
   pnpm mobile:start
   ```
   Press `a` to run on an Android emulator or `i` to launch in the iOS simulator.

---

## Step 5: Verify Operations

1. **Dashboard Access**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser. You should see the glassmorphic Admin Console.
2. **Authentication Flow**:
   Sign in via Google OAuth. The system will register your profile, allocate a free-tier organization, and sign a JWT token.
3. **Offline Sync Check**:
   Create a lead on the mobile app while offline, click the sync button to confirm sync queue pushes to PostgreSQL.

---

## Step 6: Standalone Debug Build (EAS)

For testing standalone binaries without running a local Expo development server:

1. **Configure EAS**: Make sure you are logged in to your Expo account:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. **Android Standalone Build (APK)**:
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
   This will output a downloadable `.apk` file that you can install directly on Android test devices.
3. **iOS Simulator Build**:
   ```bash
   cd mobile
   eas build --platform ios --profile simulator
   ```
   This will generate a `.tar.gz` bundle containing the simulator-ready `.app` file.
4. **CI/CD Automation**:
   Pushing to the `main` branch will automatically trigger these builds via the [.github/workflows/build-debug.yml](file:///d:/Code/AutoReach/.github/workflows/build-debug.yml) GitHub Actions pipeline (make sure to set your `EXPO_TOKEN` repository secret).

---

## Step 7: Database Deployment on Turso (libSQL)

Turso is used as our primary replicated SQLite database. Follow these steps to set it up:

1. **Install Turso CLI**:
   - macOS/Linux: `curl -sSf https://get.turso.tech/install.sh | sh`
   - Windows (PowerShell): `irm https://get.turso.tech/install.ps1 | iex`
2. **Login & Create Database**:
   ```bash
   turso auth login
   turso db create autoreach-db
   ```
3. **Retrieve Credentials**:
   Get the database URL and authentication token to configure your environment variables:
   ```bash
   # Get Database URL
   turso db show autoreach-db --url
   
   # Get Auth Token
   turso db tokens create autoreach-db
   ```
4. **Push Schema to Turso**:
   Put these variables into your local `.env` and push the tables:
   ```bash
   pnpm db:push
   ```

---

## Step 8: Google Cloud Console (OAuth Credentials)

AutoReach uses Google Authentication for users and Drive storage. You must register Web and Mobile OAuth clients in the Google Cloud Console:

1. **Create Google Cloud Project**:
   Go to the [Google Cloud Console](https://console.cloud.google.com/), create a new project.
2. **OAuth Consent Screen**:
   - Configure user type as **External** or **Internal** depending on your target.
   - Set scopes for `.../auth/userinfo.profile`, `.../auth/userinfo.email`, and `https://www.googleapis.com/auth/drive.file` (to upload files to Google Drive).
3. **Web OAuth Credentials (for Next.js)**:
   - Create credentials ➜ **OAuth client ID** ➜ **Web application**.
   - **Authorized JavaScript origins**: `http://localhost:3000` (development) and your production URL (e.g., `https://autoreach.vercel.app` or Railway URL).
   - **Authorized redirect URIs**: `http://localhost:3000/api/auth/google/callback` and `https://your-production-url.com/api/auth/google/callback`.
   - Copy `Client ID` and `Client Secret` to `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. **Mobile OAuth Credentials (for Expo App)**:
   - Create credentials ➜ **OAuth client ID** ➜ **iOS** & **Android** separately.
   - For Android: Enter your Expo Android package name (e.g. `com.autoreach.app`) and SHA-1 certificate fingerprint (retrieve from `eas credentials`).
   - For iOS: Enter your bundle ID (e.g. `com.autoreach.app`).
   - Use Expo's `AuthSession` or Google Sign-In SDK inside the app pointing to these clients.

---

## Step 9: Backend & Services Deployment on Railway

Railway hosts our Next.js API, OpenWA service, BullMQ Redis client, and Worker engines:

1. **Deploy Redis Cache**:
   - In your Railway dashboard, click **New** ➜ **Database** ➜ **Redis**.
   - Get the `REDIS_URL` from the Redis reference variables.
2. **Deploy Next.js Backend & Dashboard**:
   - Click **New** ➜ **GitHub Repo** ➜ Choose the `AutoReach` repository.
   - Add the following environment variables:
     - `DATABASE_URL` (libsql://...)
     - `DATABASE_AUTH_TOKEN` (from Turso)
     - `JWT_SECRET` (secure hash key)
     - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
     - `REDIS_URL` (referencing the Redis database)
   - Railway will automatically detect Next.js and build it.
3. **Deploy OpenWA Service (WhatsApp Bridge)**:
   - Add a new service pointing to the OpenWA package/container.
   - OpenWA requires a Chrome/Puppeteer container environment and must be allocated at least **2GB RAM** for stable performance.
4. **Deploy Background Workers**:
   - Create a service pointing to `services/workers/` directory.
   - Add same database, Redis, and secret environment variables.

---

## Step 10: Next.js Web Application Deployment (alternative: Vercel)

Alternatively, you can host the frontend Dashboard on Vercel for fast edge rendering:

1. **Import Project**:
   Link your GitHub repository to Vercel.
2. **Configure Settings**:
   - **Root Directory**: Select `web/` (or leave it to root if using Turborepo settings).
   - **Build Command**: `pnpm web:build`
   - **Output Directory**: `.next`
3. **Add Environment Variables**:
   Copy and paste the exact `.env` variables (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `GOOGLE_CLIENT_ID`, etc.).
4. **Deploy**:
   Vercel builds and deploys your dashboard statically and dynamically.

---

## Step 11: Standalone Mobile App Deployment (App Store / Google Play)

Deploying standalone mobile applications to the stores via EAS:

1. **Configure Production Profiles**:
   Verify configuration in [mobile/eas.json](file:///d:/Code/AutoReach/mobile/eas.json):
   ```json
   {
     "build": {
       "production": {
         "env": {
           "EXPO_PUBLIC_API_URL": "https://your-backend-railway-url.com"
         }
       }
     }
   }
   ```
2. **Submit to Android Play Store**:
   ```bash
   cd mobile
   eas build --platform android --profile production
   # Once build completes:
   eas submit --platform android
   ```
3. **Submit to iOS App Store**:
   ```bash
   cd mobile
   eas build --platform ios --profile production
   # Once build completes:
   eas submit --platform ios
   ```
   *Note: Ensure you have your Apple Developer and Google Play Console credentials set up.*


