# 05 API Specifications

## Routing Architecture

- All primary API services are housed under `apps/api` using Next.js Route Handlers.
- Custom actions and tasks trigger workers using Redis queues, returning execution receipt IDs to the caller immediately.

## Endpoint Flow

Every backend route handler must strictly implement:
1. **Validation**: Validate request parameters, headers, and body using schemas (e.g. Zod). Never bypass validation.
2. **Authentication**: Verify bearer JWT tokens, extracting sub IDs and tenant references.
3. **Business Logic**: Process logic inside services/actions (do not put core business logic directly in route handlers).
4. **Database Execution**: Execute Drizzle transaction scripts.
5. **Standardized Response**: Format payload matching the output standard.

## Unified JSON Response Contract

### Successful Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource created successfully",
  "timestamp": "2026-06-19T16:08:40.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid email address format",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email"
      }
    ]
  },
  "timestamp": "2026-06-19T16:08:40.000Z"
}
```
