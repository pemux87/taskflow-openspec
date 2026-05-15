## 왜 만드는가

소규모 팀은 태스크 현황과 의사결정 채팅이 서로 다른 도구에 흩어져 있어 컨텍스트 전환 비용이 크다. TaskFlow MVP는 칸반 + 실시간 채팅을 한 화면에 통합해 3-5인 팀이 별도 도구 없이 업무 흐름을 추적할 수 있게 한다.

## 변경 내용

- **신규** 회원가입 / 로그인 / JWT 인증 시스템 (bcrypt 해시, 24h 만료)
- **신규** 팀 생성 + 초대코드(AAAA-9999) 발급 + 합류 + 탈퇴 흐름
- **신규** 칸반 보드 — TODO/DOING/DONE 3컬럼, 드래그 상태 이동, 담당자(assignee) 지정
- **신규** 팀 채팅 — 5초 폴링(since= 증분), 1000자 제한, 발신자 표시
- **신규** Vercel(FE + BE Serverless) + Neon PostgreSQL 배포 파이프라인
- **신규** 모바일 반응형 UI (<768px 칸반 스와이프, 햄버거 메뉴)

범위 외: 알림, 파일 첨부, 전문 검색, WebSocket, 테스트 자동화, JWT 갱신 토큰

## 기능(Capability) 목록

### 신규 기능
- `user-auth`: 회원가입, 로그인, JWT 발급·검증, 로그아웃(stateless), 내 정보 조회
- `team-management`: 팀 생성, 초대코드 발급, 합류, 멤버 목록, 탈퇴 + 권한 모델(owner/member)
- `kanban-board`: 태스크 CRUD, 3컬럼 상태 관리, 드래그 이동, assignee 지정·필터
- `team-chat`: 메시지 송수신, 5초 폴링, 1000자 제한, 본인 메시지 삭제
- `deployment`: Vercel Serverless 배포, Neon DB 연결, 로컬(SQLite) ↔ 운영(PostgreSQL) 환경 전환

### 수정 기능
없음 (신규 프로젝트)

## 영향 범위

- **백엔드**: FastAPI 18개 엔드포인트, SQLAlchemy ORM, DB 4테이블(users/teams/tasks/messages)
- **프론트엔드**: Vanilla JS + Tailwind CSS, 9개 화면, HTML5 Drag & Drop API, setInterval 폴링
- **인프라**: Vercel 프로젝트 설정, Neon DB 프로비저닝, DATABASE_URL 환경변수
- **보안**: JWT 미들웨어, bcrypt, CORS, 멤버십 기반 403 게이트
