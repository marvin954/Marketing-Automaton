---
name: Port routing constraints
description: Only ports 8080 and 8081 map to external ports in .replit; frontend must be served from Express to avoid workflow detection failures.
---

## Rule
In this workspace, `.replit` maps only `localPort 8080 → externalPort 8080` and `localPort 8081 → externalPort 80`. Artifact workflows that listen on any other port (e.g. 3000, 5000, 5173, 22821) will have `openPorts: null` and the workflow system will report them as "failed" even though the server is running.

**Why:** The Replit workflow system detects open ports by monitoring which `.replit`-registered external ports become reachable. If the local port isn't in `.replit`'s `[[ports]]` list, `openPorts` stays `null` and the health check times out.

**How to apply:**
- API server: port 8080 (already mapped) ✓
- Mockup-sandbox: port 8081 (already mapped) ✓
- Marketing-agent frontend: served **statically from the Express API server** on port 8080. The Vite dev workflow can't use a supported port without conflicts, so build the frontend (`pnpm --filter @workspace/marketing-agent run build`) and serve `dist/public` via `express.static()` from the API server.
- When adding a new web artifact, check if a free mapped port exists. If not, either serve from Express (for frontends) or request a `.replit` port addition via the skills.
