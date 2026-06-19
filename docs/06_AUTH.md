# 06 Authentication & Session Specifications

## Core Mechanism

- **Authentication Provider**: Google OAuth.
- **Library**: `expo-auth-session` on Mobile; NextAuth or standalone OAuth routing on Dashboard.
- **Rules**: Never use Firebase Authentication under any circumstances.

## Flow Diagram

```
User (Mobile App)
   │
   ▼
Triggers Google Login (via expo-auth-session)
   │
   ▼
Obtains Google ID Token
   │
   ▼
Sends ID Token to Backend API (/api/auth/google)
   │
   ▼
Backend verifies Token using Google Auth Library
   │
   ▼
Creates or Fetches User in Database (Neon PostgreSQL)
   │
   ▼
Generates custom application JWT (Auth Token)
   │
   ▼
Returns JWT to Mobile client
   │
   ▼
Mobile stores JWT securely in Expo Secure Store
```

## JWT Storage Rules

1. **Expo Secure Store**: Used exclusively on Mobile devices to save long-lived session JWT tokens and refresh credentials.
2. **Dashboard Storage**: Sessions on Dashboard are saved in HttpOnly cookie scopes or local secure memory state to prevent Cross-Site Scripting (XSS) leaks.
3. **Session Check**: Mobile client attaches the JWT to the `Authorization: Bearer <token>` header of every API request.
