---
name: Orval codegen TS2308 collision rule
description: Never add query params to OpenAPI operations that also have path params — Orval generates both a Zod schema and TS type with the same name, causing TS2308.
---

## Rule
When an OpenAPI operation has both path parameters AND query parameters, Orval generates:
- A Zod schema named e.g. `FetchContentParams`
- A TypeScript type named `FetchContentParams`

Both names collide → `TS2308: Module ... exports 'FetchContentParams' multiple times`.

**Why:** Orval derives the schema name from the `operationId` and appends "Params" for both the Zod schema (query params) and the path params type. When both exist, the name collision breaks TypeScript compilation.

**How to apply:**
- If an operation needs both path params AND query params, remove the query params from the OpenAPI spec and handle filtering/pagination in the route handler instead.
- Alternatively, use a unique `operationId` prefix that doesn't collide, but the safest fix is to simply not use query params on operations with path params.
- Check for TS2308 errors after codegen with `pnpm -w run typecheck:libs`.
