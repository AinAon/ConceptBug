# ConceptBug

Frontend + Cloudflare Worker backend for Gemini image workflows.

## 1) Run Backend (Cloudflare Worker)

```bash
cd backend
npm install
copy .dev.vars.example .dev.vars
npm run dev
```

Backend local URL: `http://127.0.0.1:8787`

Required secrets for deploy:

```bash
cd backend
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_PASSWORD
```

## 2) Run Frontend

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

`.env.local` should contain:

```env
VITE_API_BASE_URL=http://127.0.0.1:8787
```

## Backend APIs used by frontend

- `POST /api/translate`
- `POST /api/extract-prompt`
- `POST /api/generate-image`
- `POST /api/upscale-image`

All `/api/*` calls require `X-App-Password` header.
