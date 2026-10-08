# AI 수학 오답노트 — GitHub Pages PWA

이 폴더는 **GitHub Pages에서 바로 배포할 수 있는 PWA 프론트엔드**입니다.

## 포함 기능

- 스마트폰 카메라/갤러리에서 문제지 사진 선택
- AI 서버에 사진 전송
- 틀린 문제 자동 추출
- 학생 답안/채점 표시 제거 결과 표시
- 오답을 브라우저 LocalStorage에 저장
- 오답 모음 / 오답노트
- 브라우저 인쇄 기능으로 PDF 저장
- PWA 설치 지원
- GitHub Actions 자동 배포

## 중요

GitHub Pages는 정적 파일 호스팅이므로 Python/FastAPI 같은 서버 코드를 실행할 수 없습니다.
따라서 이 프로젝트의 `server/`는 별도의 서버에 배포하고, 앱의 `⚙️ 설정`에서 서버 주소를 입력해야 합니다.

OpenAI API 키는 **절대로 GitHub Pages 프론트엔드에 넣지 마세요.**
API 키는 FastAPI 서버의 환경변수에만 저장합니다.

## GitHub Pages 배포

1. GitHub에서 새 repository를 만듭니다.
2. 이 프로젝트의 파일을 repository에 업로드합니다.
3. `Settings → Pages`로 이동합니다.
4. `Build and deployment → Source`에서 `GitHub Actions`를 선택합니다.
5. `main`에 push하면 `.github/workflows/pages.yml`이 자동으로 배포합니다.

배포 주소는 일반적으로:
`https://사용자이름.github.io/저장소이름/`

## AI 서버

`server/` 폴더에 FastAPI 서버 예제가 들어 있습니다.

```bash
cd server
pip install -r requirements.txt
export OPENAI_API_KEY="YOUR_API_KEY"
uvicorn main:app --host 0.0.0.0 --port 8000
```

Windows PowerShell:
```powershell
$env:OPENAI_API_KEY="YOUR_API_KEY"
uvicorn main:app --host 0.0.0.0 --port 8000
```

그 다음 PWA의 `설정`에서 예를 들어:
`https://your-ai-server.example.com`

을 입력합니다.

## 폴더 구조

```text
/
├── index.html
├── manifest.json
├── sw.js
├── .nojekyll
├── README.md
├── .github/
│   └── workflows/
│       └── pages.yml
└── server/
    ├── main.py
    ├── requirements.txt
    └── Dockerfile
```
