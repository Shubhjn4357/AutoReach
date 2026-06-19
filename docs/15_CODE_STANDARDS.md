# 15 Code Standards

## Core Rules

1. **TypeScript Only**: JavaScript is prohibited. TypeScript Strict Mode must be enabled across all configuration contexts.
2. **No `any`**: Explicitly type all variables, arguments, and return types. Use `unknown` with verification functions if the payload is dynamic.
3. **No Business Logic in Views**: Component files must only render UI structure and handle interaction hooks. All data fetching, sync operations, and processing must be extracted into custom React hooks or standalone service files.
4. **Component Sizing**: Keep component files under ~300 lines of code. Extract larger portions into separate reusable components or local sub-files.
5. **Prefer Composition**: Build UI through composition of core primitive design components (`packages/ui`).

## Directory Formatting

All features must adopt the standard folder layout:

```
feature_name/
├── components/   # Presentation elements
├── hooks/        # React hooks containing business/sync logic
├── services/    # Client side API wrappers
├── schemas/     # Validation rule declarations (Zod schemas)
├── types/       # TypeScript types
└── utils/       # Utility helpers
```
