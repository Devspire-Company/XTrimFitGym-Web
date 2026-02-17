# XTrimFitGym Web

Admin web app for X-TRIM FIT GYM.

## Environment variables

Copy `.env.example` to `.env` and set:

- **`VITE_GRAPHQL_URL`** – GraphQL API endpoint (required in production).
  - Local: `http://localhost:8000/graphql` (default if unset).
  - Production: set to your deployed API URL, e.g. `https://your-api.railway.app/graphql`.
- **`VITE_GRAPHQL_WS_URL`** (optional) – WebSocket URL for subscriptions. If unset, derived from `VITE_GRAPHQL_URL`.

## Deployment (Vercel)

1. Deploy **XTrimFitGym-Api** first (e.g. Railway, Render) and note its URL.
2. In the Vercel project for **XTrimFitGym-Web**, go to **Settings → Environment Variables**.
3. Add **`VITE_GRAPHQL_URL`** = `https://<your-api-domain>/graphql` (Production, Preview, Development).
4. Redeploy the web app so the build picks up the variable.

Without `VITE_GRAPHQL_URL` in production, the app sends requests to the same origin and login returns 404.

