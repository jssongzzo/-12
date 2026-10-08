# AI 수학 오답노트 — GitHub Pages + Cloudflare Worker

## 기능
- 휴대폰 카메라/사진 여러 장 업로드
- AI가 문제 영역, 학생 답안, 채점 표시, 오답 여부 분석
- 틀린 문제만 추출
- 학생 필기와 채점 표시를 제거한 깨끗한 문제 이미지 생성 시도
- 문제/학생답/정답/틀린 이유/풀이를 오답노트로 정리
- 브라우저 인쇄 기능으로 PDF 저장
- PWA 설치 및 기본 오프라인 캐시

## 1. GitHub Pages
저장소에 `index.html`, `manifest.json`, `sw.js`, `icons/`를 그대로 올립니다.
GitHub → Settings → Pages → Deploy from branch → main / root 를 선택합니다.

## 2. AI 서버
`worker/`는 Cloudflare Worker용입니다.

### 설치
```bash
npm install -g wrangler
cd worker
wrangler login
wrangler secret put OPENAI_API_KEY
wrangler deploy
```
배포 후 나온 `https://....workers.dev` 주소를 앱의 **AI 서버 설정**에 입력하고 저장합니다.

### 주의
- OpenAI API 키를 `index.html`이나 GitHub 저장소에 절대 넣지 마세요.
- API 사용료가 발생할 수 있습니다.
- 이미지 편집 결과는 원본 인쇄물을 최대한 보존하도록 요청하지만, AI 이미지 편집 특성상 모든 글자/수식의 100% 동일 보존을 보장할 수 없습니다. 중요한 자료는 원본과 결과를 함께 확인하세요.

## 3. 동작 구조
GitHub Pages PWA → Cloudflare Worker → OpenAI Responses API(문제/오답 분석) → 이미지 편집 API(필기/채점 표시 제거) → JSON + 이미지 → PWA 오답노트

OpenAI의 최신 통합에는 Responses API 사용을 권장하며, Assistants API는 2026-08-26 종료되었습니다.
