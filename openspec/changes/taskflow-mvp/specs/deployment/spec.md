## ADDED Requirements

### Requirement: 로컬 개발 환경
개발자는 로컬에서 FastAPI + SQLite로 즉시 실행할 수 있어야 한다(SHALL).

#### Scenario: 로컬 서버 실행
- **WHEN** DATABASE_URL 미설정 또는 SQLite URL로 uvicorn 실행
- **THEN** FastAPI 서버가 SQLite 파일(taskflow.db)에 연결되어 정상 동작

#### Scenario: 환경 전환
- **WHEN** DATABASE_URL=postgresql+asyncpg://... 환경변수 설정 후 실행
- **THEN** Neon PostgreSQL에 연결되어 동일 API 동작

### Requirement: Vercel 배포
FastAPI 백엔드와 프론트엔드 정적 파일을 Vercel에 배포할 수 있어야 한다(SHALL).
- FastAPI는 mangum ASGI 어댑터를 통해 Vercel Serverless Functions로 실행.
- 프론트엔드 정적 파일은 public/ 디렉토리에서 서빙.
- git push origin main 시 자동 배포.

#### Scenario: 배포 후 API 동작
- **WHEN** main 브랜치 push 후 Vercel 배포 완료
- **THEN** https://<project>.vercel.app/api/* 엔드포인트가 정상 응답

#### Scenario: 프론트엔드 서빙
- **WHEN** https://<project>.vercel.app 접근
- **THEN** public/index.html 서빙

### Requirement: Neon PostgreSQL 연결
운영 환경에서 Neon PostgreSQL을 DB로 사용해야 한다(SHALL).
- DATABASE_URL 환경변수로 연결 문자열 주입.
- Vercel 프로젝트 환경변수로 관리.

#### Scenario: Neon 연결 정상
- **WHEN** DATABASE_URL=postgresql+asyncpg://<neon-url> 설정 후 API 호출
- **THEN** DB 읽기/쓰기 정상 동작

### Requirement: 에러 응답 표준
모든 API 에러 응답은 표준 형식을 따라야 한다(SHALL).

#### Scenario: 4xx 에러 응답 형식
- **WHEN** 유효하지 않은 요청으로 API 호출
- **THEN** { "error": { "code": "<SCREAMING_SNAKE>", "message": "<한국어 메시지>" } } 형식으로 반환

#### Scenario: 에러 코드 목록
- **WHEN** 각 오류 상황 발생
- **THEN** 400:VALIDATION_ERROR, 400:TOO_LONG, 401:INVALID_CREDENTIALS, 401:TOKEN_EXPIRED, 403:FORBIDDEN, 403:NOT_OWNER, 404:NOT_FOUND, 409:EMAIL_TAKEN 중 해당 코드 반환
