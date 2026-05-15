## ADDED Requirements

### Requirement: 회원가입
시스템은 이메일과 비밀번호를 받아 새 계정을 생성하고 JWT를 즉시 발급해야 한다(SHALL).
- 이메일은 RFC 5322 형식이어야 하며, 중복 등록을 허용하지 않는다.
- 비밀번호는 8자 이상이어야 하며, bcrypt로 해시하여 저장한다.
- 성공 시 HTTP 201과 JWT(24h 만료)를 반환한다.

#### Scenario: 정상 회원가입
- **WHEN** 유효한 이메일과 8자 이상 비밀번호로 POST /auth/signup 요청
- **THEN** 201 Created + { token, user: { id, email, team_id: null } } 반환

#### Scenario: 이메일 중복
- **WHEN** 이미 가입된 이메일로 POST /auth/signup 요청
- **THEN** 409 + { error: { code: "EMAIL_TAKEN", message: "이미 가입된 이메일입니다" } }

#### Scenario: 이메일 형식 오류
- **WHEN** 유효하지 않은 이메일 형식으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

#### Scenario: 비밀번호 8자 미만
- **WHEN** 7자 이하 비밀번호로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

### Requirement: 로그인
시스템은 이메일/비밀번호를 검증하여 JWT를 발급해야 한다(SHALL).
- 이메일 존재 여부를 응답에서 노출하지 않는다(보안).
- 성공 시 users.team_id를 포함하여 반환하고 클라이언트는 이를 기반으로 화면을 분기한다.

#### Scenario: 정상 로그인
- **WHEN** 등록된 이메일과 올바른 비밀번호로 POST /auth/login 요청
- **THEN** 200 + { token, user: { id, email, team_id } } 반환

#### Scenario: 잘못된 자격증명
- **WHEN** 존재하지 않는 이메일 또는 잘못된 비밀번호로 요청
- **THEN** 401 + { error: { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 일치하지 않습니다" } }

#### Scenario: 로그인 후 팀 미가입 분기
- **WHEN** 로그인 성공 후 team_id가 null인 경우
- **THEN** 클라이언트는 팀 선택 화면으로 redirect

#### Scenario: 로그인 후 팀 가입 분기
- **WHEN** 로그인 성공 후 team_id가 존재하는 경우
- **THEN** 클라이언트는 칸반 화면으로 redirect

### Requirement: 로그아웃
시스템은 stateless 로그아웃을 지원해야 한다(SHALL).
- 서버는 JWT 블랙리스트를 관리하지 않는다.
- 클라이언트가 localStorage에서 토큰을 삭제함으로써 로그아웃한다.

#### Scenario: 로그아웃 요청
- **WHEN** 유효한 JWT로 POST /auth/logout 요청
- **THEN** 200 + {} 반환 (서버 측 상태 변경 없음)

#### Scenario: 클라이언트 토큰 삭제
- **WHEN** 로그아웃 응답 수신
- **THEN** localStorage에서 token 삭제 후 /login으로 redirect

### Requirement: 내 정보 조회
인증된 사용자는 자신의 정보를 조회할 수 있어야 한다(SHALL).

#### Scenario: 정상 조회
- **WHEN** 유효한 JWT로 GET /auth/me 요청
- **THEN** 200 + { id, email, team_id } 반환

#### Scenario: 미인증 요청
- **WHEN** JWT 없이 또는 만료된 JWT로 요청
- **THEN** 401 + { error: { code: "TOKEN_EXPIRED" } }

### Requirement: JWT 만료 처리
클라이언트는 모든 API 응답에서 401을 감지하여 자동으로 재로그인 흐름을 실행해야 한다(SHALL).

#### Scenario: JWT 만료 후 API 호출
- **WHEN** 만료된 JWT로 어떤 API든 호출
- **THEN** 401 TOKEN_EXPIRED 수신 → localStorage 토큰 삭제 → /login redirect
