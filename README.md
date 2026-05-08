# Tangshan Outage Analysis Frontend (Vue 3 + JavaScript)

## Run

```bash
npm install
npm run proxy
npm run dev
```

Notes:
1. `npm run proxy` starts the Node proxy service (default port: `32002`).
2. Frontend requests use `/realMeasCenter`, and Vite forwards them to the proxy service.
3. The proxy service reads token from Redis first. If missing, it requests a new token from the OAuth API, stores it in Redis, then forwards business APIs with that token.

## Implemented

- Outage analysis dashboard modules on the left panel.
- AMap rendering with Tangshan boundary highlight and marker interactions.
- API wrappers: `queryOutageIndex`, `queryOutageList`, `queryOutageUserDetail`, `queryOutageDetailRuleStatistic`.
- Error-first API behavior (no demo fallback data).
- New intranet proxy service with Redis token cache and auto refresh.

## Configuration

Copy `.env.example` to `.env`, then configure:
1. AMap keys: `VITE_AMAP_KEY`, `VITE_AMAP_SECURITY_CODE`
2. Redis: recommended `REDIS_URL`, or `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
3. OAuth token API: `OAUTH_TOKEN_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
4. Token header prefix: `TOKEN_HEADER_PREFIX` (if upstream requires `Bearer <token>`, set to `Bearer`; fallback can be configured by `TOKEN_HEADER_PREFIX_FALLBACKS`)

Health check:
`GET http://127.0.0.1:32002/health`
