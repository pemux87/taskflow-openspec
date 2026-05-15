## 1. 프로젝트 초기화 및 환경 설정

- [x] 1.1 디렉토리 구조 생성 (api/, public/js/, public/css/, public/)
- [x] 1.2 requirements.txt 작성 (fastapi, uvicorn, sqlalchemy, aiosqlite, asyncpg, python-jose, bcrypt, mangum, pydantic)
- [x] 1.3 vercel.json 작성 (라우팅: /api/* → Serverless Function, /* → public/)
- [x] 1.4 .env.example 작성 (DATABASE_URL, JWT_SECRET, CORS_ORIGINS)
- [x] 1.5 .gitignore 설정 (*.db, .env, __pycache__, .vercel)

## 2. 백엔드 기반 (FastAPI + DB)

- [x] 2.1 api/database.py — DATABASE_URL 기반 SQLAlchemy 엔진 + 세션 팩토리
- [x] 2.2 api/models.py — users, teams, tasks, messages 4테이블 ORM 모델 + 인덱스
- [x] 2.3 api/schemas.py — 요청/응답 Pydantic 스키마 전체
- [x] 2.4 api/auth.py — JWT 발급(24h) / 검증 / bcrypt 해시 유틸
- [x] 2.5 api/index.py — FastAPI app 생성, CORS 설정, mangum 핸들러, 라우터 등록
- [x] 2.6 DB 테이블 자동 생성 (startup 이벤트에서 create_all)

## 3. 인증 API (user-auth)

- [x] 3.1 POST /auth/signup — 이메일 중복 검사, bcrypt 해시, users INSERT, JWT 반환
- [x] 3.2 POST /auth/login — 이메일 조회, bcrypt 검증, JWT 반환 (team_id 포함)
- [x] 3.3 POST /auth/logout — 200 반환 (stateless)
- [x] 3.4 GET /auth/me — JWT 의존성으로 현재 사용자 반환
- [x] 3.5 JWT 인증 미들웨어 의존성 함수 (get_current_user)

## 4. 팀 API (team-management)

- [x] 4.1 POST /teams — 팀 생성, invite_code 자동생성(^[A-Z]{4}-[0-9]{4}$), users.team_id 업데이트
- [x] 4.2 POST /teams/join — 초대코드 형식 검증 + DB 조회, users.team_id 업데이트
- [x] 4.3 GET /teams/{id} — 팀 정보 반환 (멤버십 검증)
- [x] 4.4 GET /teams/{id}/members — 멤버 목록 반환 (owner/member 구분)
- [x] 4.5 DELETE /teams/{id}/leave — 멤버 탈퇴 (owner 탈퇴 차단, team_id NULL)
- [x] 4.6 팀 멤버십 검증 미들웨어 의존성 함수 (get_team_member)

## 5. 칸반 API (kanban-board)

- [x] 5.1 GET /teams/{id}/tasks — 목록 조회, filter 파라미터(all/me/unassigned) 처리
- [x] 5.2 POST /teams/{id}/tasks — 태스크 생성 (status=TODO, creator_id=나)
- [x] 5.3 GET /tasks/{id} — 단일 태스크 조회
- [x] 5.4 PUT /tasks/{id} — 제목·assignee_id 수정
- [x] 5.5 PATCH /tasks/{id}/status — 상태 변경 (TODO/DOING/DONE 검증)
- [x] 5.6 DELETE /tasks/{id} — creator 또는 owner만 삭제 (403 게이트)

## 6. 채팅 API (team-chat)

- [x] 6.1 GET /teams/{id}/messages?since= — 증분 폴링 (since 없으면 최근 50건)
- [x] 6.2 POST /teams/{id}/messages — 메시지 전송 (1000자 서버 검증)
- [x] 6.3 DELETE /messages/{id} — 본인 메시지만 삭제 (403 게이트)

## 7. 에러 응답 표준화

- [x] 7.1 글로벌 예외 핸들러 등록 (HTTPException → { error: { code, message } } 형식)
- [x] 7.2 에러 코드 상수 정의 (VALIDATION_ERROR, TOO_LONG, INVALID_CREDENTIALS, TOKEN_EXPIRED, FORBIDDEN, NOT_OWNER, NOT_FOUND, EMAIL_TAKEN)

## 8. 프론트엔드 기반 (Vanilla JS + Tailwind)

- [x] 8.1 public/index.html — Tailwind CDN, 기본 레이아웃, hash router 설정
- [x] 8.2 public/js/api.js — fetch 래퍼 (JWT 헤더 자동 첨부, 401 인터셉터 → /login redirect)
- [x] 8.3 public/js/router.js — hash 기반 라우터 (#/login, #/team, #/kanban, #/chat)
- [x] 8.4 public/js/auth.js — localStorage JWT 관리 (저장/읽기/삭제/만료 감지)

## 9. 프론트엔드 화면 구현

- [x] 9.1 회원가입 화면 — 이메일/비밀번호 입력, 클라이언트 validation, POST /auth/signup
- [x] 9.2 로그인 화면 — 입력, 처리중 상태, 401 에러 표시, team_id 기반 분기
- [x] 9.3 팀 선택 화면 — 팀 만들기 + 초대코드 합류 양식, 초대코드 형식 검증
- [x] 9.4 칸반 화면 — 3컬럼 레이아웃, 카드 렌더링, 필터 버튼 (전체/@me/미할당)
- [x] 9.5 칸반 — 인라인 태스크 추가 (+버튼 → 입력 폼, Enter 저장, Esc 취소)
- [x] 9.6 칸반 — HTML5 Drag & Drop (dragstart/dragover/drop → PATCH /tasks/{id}/status)
- [x] 9.7 칸반 — 카드 상세 모달 (제목·상태·assignee 수정, 삭제 버튼, 권한별 표시)
- [x] 9.8 채팅 화면 — 메시지 목록, 말풍선 UI, 5초 setInterval 폴링
- [x] 9.9 채팅 — 1000자 카운터, 초과 시 버튼 비활성화, 전송 후 스크롤 하단 고정
- [x] 9.10 채팅 — 본인 메시지 호버 시 삭제 아이콘, DELETE /messages/{id}
- [x] 9.11 팀 멤버 패널 — owner★/member 구분 표시

## 10. 모바일 반응형

- [x] 10.1 칸반 — 768px 미만에서 1컬럼 스와이프 (CSS transform + touch 이벤트)
- [x] 10.2 칸반 — 모바일 상단 컬럼 인디케이터 (TODO/DOING/DONE 탭)
- [x] 10.3 칸반 — 카드 길게 누르기 → 상태 선택 메뉴 (longpress 이벤트)
- [x] 10.4 칸반 — 우하단 FAB(+) 버튼으로 태스크 추가
- [x] 10.5 채팅 — 모바일 풀스크린, visualViewport API로 키보드 대응
- [x] 10.6 채팅 — 입력 포커스 시 폴링 2초로 단축, 블러 시 5초 복원
- [x] 10.7 공통 — 햄버거 메뉴 (칸반/채팅/멤버/로그아웃 항목)

## 11. 배포 (deployment)

- [x] 11.1 vercel.json 라우팅 최종 검증 (api/* → Function, /* → public/)
- [ ] 11.2 Vercel 프로젝트 생성 + GitHub 연동
- [ ] 11.3 Neon DB 프로비저닝 + DATABASE_URL Vercel 환경변수 설정
- [ ] 11.4 JWT_SECRET, CORS_ORIGINS Vercel 환경변수 설정
- [ ] 11.5 main 브랜치 push → 자동 배포 확인
- [ ] 11.6 배포된 URL에서 기능 5종(인증/팀/칸반/채팅/모바일) 수동 동작 확인
