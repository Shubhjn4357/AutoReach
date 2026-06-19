# 16 Testing Specifications

## Testing Strategy

To ensure code stability, a multi-tiered testing plan is defined:

1. **Unit Testing**:
   - Framework: Vitest.
   - Applied to: Shared utility functions, Zod validation schemas, business logic handlers, and state transformers in `packages/*`.
2. **Integration Testing**:
   - Framework: Supertest + Vitest for backend APIs; React Native Testing Library for mobile components.
   - Applied to: Route handlers verifying database interactions and JWT validations.
3. **End-to-End (E2E) Testing**:
   - Framework: Playwright for Dashboard Web App; Detox for Expo Mobile App.
   - Applied to: Core workflows (e.g. Lead creation, offline queue synchronization, messaging triggers).

## Running Tests

- Run all unit tests:
  ```bash
  pnpm test
  ```
- Run tests with coverage:
  ```bash
  pnpm test:coverage
  ```
