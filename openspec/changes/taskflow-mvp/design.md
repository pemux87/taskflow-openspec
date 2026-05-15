## 배경

신규 프로젝트. 기존 코드베이스 없음. 학습 목적 + 실전 배포를 동시에 달성하는 것이 목표로, 단순성과 표준성을 균형 있게 선택한다.

## 목표 / 비목표

**목표:**
- FastAPI + Vanilla JS + Tailwind로 풀스택 MVP 완성
- 로컬(SQLite) ↔ 운영(Neon PostgreSQL) 환경 전환을 DATABASE_URL 하나로 처리
- Vercel에 FE(정적) + BE(Serverless Functions) 단일 배포
- 18개 API 전체 구현 + JWT 인증 미들웨어 + 권한 게이트

**비목표:**
- WebSocket 실시간 통신
- JWT 갱신 토큰 / 블랙리스트
- 테스트 자동화(pytest/jest)
- 마이크로서비스 분리

## 기술 결정

### 결정 1 — 백엔드: FastAPI (Python)
Node.js/Express 대신 FastAPI를 선택한다.
- **이유**: auto OpenAPI 문서, async 지원, Pydantic 기반 자동 validation이 18개 엔드포인트 구현 속도를 높임
- **대안 고려**: Express(JS) → FE와 언어 통일되지만 학습 목적상 Python 스택 유지

### 결정 2 — ORM: SQLAlchemy (비동기)
- **이유**: SQLite(로컬)와 PostgreSQL(운영) 모두 지원. DATABASE_URL 환경변수 하나로 전환
- `asyncpg`(운영) + `aiosqlite`(로컬) 드라이버 조합

### 결정 3 — 인증: JWT stateless (갱신 토큰 없음)
- **이유**: Day 2 범위 내 단순성. 블랙리스트 없이 클라이언트가 토큰 삭제로 로그아웃
- **트레이드오프**: 24h 만료 전 강제 만료 불가. 분실 시 대응 없음 → 범위 외로 명시

### 결정 4 — 채팅: 5초 폴링 (WebSocket 대신)
- **이유**: WebSocket은 Vercel Serverless에서 지원 불가. 폴링으로 MVP 요건 충족
- `since=<ISO timestamp>` 파라미터로 증분 조회, 중복 메시지 없음

### 결정 5 — 1인 1팀 제약 (users.team_id)
- `users.team_id FK→teams NULL` 컬럼으로 소속 팀 추적
- NULL = 미가입, 팀 합류 시 UPDATE, 탈퇴 시 NULL로 복원
- **이유**: 별도 멤버십 테이블 없이 4테이블 제약 유지. 단일 팀만 지원하는 MVP 범위에 적합

### 결정 6 — 프론트엔드: Vanilla JS + Tailwind (프레임워크 없음)
- **이유**: 학습 목적. SPA 라우팅은 hash routing(`#/kanban`, `#/chat`)으로 단순 구현
- Tailwind CDN 사용(빌드 없음), HTML5 native Drag & Drop API

### 결정 7 — 배포: Vercel Serverless Functions
- FastAPI를 `api/index.py`에 ASGI 어댑터(`mangum`)로 감싸 Vercel Functions로 배포
- 프론트엔드 정적 파일은 `public/` 디렉토리에서 Vercel이 서빙

## 리스크 / 트레이드오프

| 리스크 | 대응 |
|--------|------|
| Vercel Functions cold start (~1s) | 첫 요청 지연 감수. 성능 SLA는 warm 기준 |
| SQLite → PostgreSQL 호환성 차이 | SQLAlchemy ORM으로 추상화. AUTOINCREMENT 등 방언 주의 |
| 5초 폴링 과부하 | 팀당 5명 제약으로 동시 요청 최대 5건. 무료 티어 범위 내 |
| JWT 탈취 후 24h 유효 | 범위 외로 명시. 필요 시 추후 블랙리스트 추가 |
| HTML5 Drag & Drop 모바일 미지원 | 모바일에서는 길게 누르기 → 상태 선택 메뉴로 대체 |

## 디렉토리 구조 (예상)

```
taskflow-openspec/
├── api/
│   ├── index.py          # FastAPI app + mangum 어댑터
│   ├── routers/          # auth, teams, tasks, messages
│   ├── models.py         # SQLAlchemy 모델
│   ├── schemas.py        # Pydantic 스키마
│   ├── auth.py           # JWT 유틸
│   └── database.py       # DB 연결 (DATABASE_URL)
├── public/               # 프론트엔드 정적 파일
│   ├── index.html
│   ├── js/
│   └── css/
├── vercel.json           # 라우팅 설정
└── requirements.txt
```

## 미결 사항

- Tailwind: CDN vs CLI 빌드 (CDN으로 시작, 필요 시 전환)
- SQLAlchemy sync vs async (Vercel Functions에서 async 이슈 있을 경우 sync 전환)
