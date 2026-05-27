---
name: Express 5 wildcard routes
description: app.get("*", handler) throws PathError in Express 5 (path-to-regexp v8); use app.use(handler) instead.
---

## Rule
In Express 5 (which uses path-to-regexp v8), wildcard route patterns like `"*"` or `"/*"` throw:
```
PathError [TypeError]: Missing parameter name at index 1: *
```

**Why:** path-to-regexp v8 no longer supports bare `*` wildcards. It requires named params like `:param*`.

**How to apply:**
- ✗ WRONG: `app.get("*", handler)` — throws PathError at startup
- ✓ CORRECT: `app.use(handler)` — matches all unhandled routes, works as SPA fallback

For static file serving + SPA fallback:
```typescript
app.use(express.static(frontendDist));
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"));
});
```
