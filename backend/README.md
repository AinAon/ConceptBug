# ConceptBug Backend (Cloudflare Worker)

## 1) Install

```bash
npm install
```

## 2) Local env

`.dev.vars` 파일을 만들고 값 입력:

```env
GEMINI_API_KEY=...
APP_PASSWORD=...
```

## 3) Run local

```bash
npm run dev
```

기본 주소: `http://127.0.0.1:8787`

## 4) Deploy

```bash
npm run deploy
```

배포 전 시크릿 등록:

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_PASSWORD
```

## API Endpoints

- `POST /api/translate`
- `POST /api/extract-prompt`
- `POST /api/generate-image`
- `POST /api/upscale-image`

모든 `/api/*` 요청은 `X-App-Password` 헤더가 필요합니다.
