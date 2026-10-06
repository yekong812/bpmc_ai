# 부평감리교회 AI (bpmc_ai)

교회 주보·수련회·청년부정보·행사를 관리하고, RAG 기반으로 자연어 질문에 답하는 웹 서비스입니다.

설계서 기준 구현 순서:

1. **Phase 1** — 기반 (Next.js, DB, 관리자 인증, `/admin` 보호)
2. Phase 2 — CMS
3. Phase 3 — RAG / Qdrant
4. Phase 4 — Chat
5. Phase 5 — 품질 / 배포

## 기술 스택

- Next.js (App Router) + TypeScript + Tailwind
- MariaDB (원본 데이터)
- Qdrant (Vector Index, Phase 3)
- OpenAI API (Phase 3~4)

## Windows 경로 안내

프로젝트 경로에 한글이 포함되면 Next.js Native 모듈(SWC)이 Windows에서
크래시할 수 있습니다. 이 경우 ASCII 경로에서 실행하세요.

```powershell
# 예: 정션(바로가기) 생성 후 해당 경로에서 작업
cmd /c mklink /J "C:\Users\YEBIN KIM\bpmc_ai" "C:\Users\YEBIN KIM\Desktop\부평감리교회\bpmc_ai"
cd C:\Users\YEBIN KIM\bpmc_ai
npm run dev
```

## 시작하기

### 1. 환경변수

```bash
cp .env.example .env.local
```

`.env.local`에 최소한 다음을 설정합니다.

- `DATABASE_URL`
- `AUTH_SECRET` (16자 이상)

### 2. DB 초기화

MariaDB에 데이터베이스를 만든 뒤:

```bash
npm run db:init
```

`admin_user`, `ai_document` 테이블을 생성하고 시드 관리자 계정을 넣습니다.

기본 시드 계정:

- 아이디: `admin`
- 비밀번호: `admin1234!`

변경하려면 `ADMIN_SEED_LOGIN_ID`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_NAME`을 설정합니다.

### 3. 개발 서버

```bash
npm run dev
```

- 사용자 홈: http://localhost:3000
- 관리자: http://localhost:3000/admin

## Phase 1~4 범위

- Next.js / TypeScript 프로젝트
- 환경변수 및 MariaDB 연결 (`lib/db`)
- `ai_document`, `admin_user` 스키마
- 관리자 로그인 / 세션 쿠키 (HttpOnly)
- `/admin/**`, `/api/admin/**` 인증 보호
- 콘텐츠 목록/등록/수정/보관(ARCHIVED)/게시
- 카테고리별 Validation 및 동적 Form
- 주보 PDF 업로드 / 원본 저장 / 텍스트 추출 / Preview
- Qdrant Collection / Chunking / Embedding / Indexer
- 게시·수정 시 자동 Re-index, 실패 재시도, 전체 Re-index
- `/api/chat` + 날짜/카테고리 Metadata Filter + GPT 답변/출처
- 사용자 Chat UI (스트리밍)

## 주요 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run db:init` | 스키마 적용 + 관리자 시드 |
| `npm run db:reindex` | 게시/보관 문서 전체 Qdrant Re-index |
