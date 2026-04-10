<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ConceptBug Frontend

Cloudflare Worker(backend)와 연결해서 사용하는 프론트엔드입니다.  
Gemini API 키는 프론트에 넣지 않고, 백엔드에서만 관리합니다.

## Local Run

1. Install dependencies: `npm install`
2. Set backend URL in `.env.local`:
   `VITE_API_BASE_URL=https://your-worker-domain.workers.dev`
3. Run app: `npm run dev`

## Backend Contract (expected)

Frontend는 아래 POST 엔드포인트를 호출합니다.

- `/api/translate`
- `/api/extract-prompt`
- `/api/generate-image`
- `/api/upscale-image`

모든 요청 헤더에 `X-App-Password`를 포함합니다.
