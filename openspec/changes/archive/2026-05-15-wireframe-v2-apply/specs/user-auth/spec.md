## MODIFIED Requirements

### Requirement: 로그인
시스템은 이메일/비밀번호를 검증하여 JWT를 발급해야 한다(SHALL).
- 이메일 존재 여부를 응답에서 노출하지 않는다(보안).
- 성공 시 users.team_id를 포함하여 반환하고 클라이언트는 이를 기반으로 화면을 분기한다.
- 로그인 성공 시 클라이언트는 "✓ 성공! 이동 중…" 상태를 400ms 동안 표시한 후 redirect해야 한다(SHALL).

#### Scenario: 정상 로그인
- **WHEN** 등록된 이메일과 올바른 비밀번호로 POST /auth/login 요청
- **THEN** 200 + { token, user: { id, email, team_id } } 반환

#### Scenario: 로그인 성공 상태 표시
- **WHEN** 로그인 API 응답 200 수신
- **THEN** 버튼 텍스트가 "✓ 성공! 이동 중…"으로 변경되고 녹색으로 표시된 뒤 400ms 후 redirect

#### Scenario: 잘못된 자격증명
- **WHEN** 존재하지 않는 이메일 또는 잘못된 비밀번호로 요청
- **THEN** 401 + { error: { code: "INVALID_CREDENTIALS", message: "이메일 또는 비밀번호가 일치하지 않습니다" } }

#### Scenario: 로그인 후 팀 미가입 분기
- **WHEN** 로그인 성공 후 team_id가 null인 경우
- **THEN** 클라이언트는 팀 선택 화면으로 redirect

#### Scenario: 로그인 후 팀 가입 분기
- **WHEN** 로그인 성공 후 team_id가 존재하는 경우
- **THEN** 클라이언트는 칸반 화면으로 redirect

### Requirement: 회원가입
시스템은 이메일과 비밀번호를 받아 새 계정을 생성하고 JWT를 즉시 발급해야 한다(SHALL).
- 이메일은 RFC 5322 형식이어야 하며, 중복 등록을 허용하지 않는다.
- 비밀번호는 8자 이상이어야 하며, bcrypt로 해시하여 저장한다.
- 성공 시 HTTP 201과 JWT(24h 만료)를 반환한다.
- 이메일 중복(EMAIL_TAKEN) 에러는 상단 배너가 아닌 이메일 입력 필드 바로 아래에 인라인으로 표시해야 한다(SHALL).

#### Scenario: 정상 회원가입
- **WHEN** 유효한 이메일과 8자 이상 비밀번호로 POST /auth/signup 요청
- **THEN** 201 Created + { token, user: { id, email, team_id: null } } 반환

#### Scenario: 이메일 중복 인라인 에러
- **WHEN** 이미 가입된 이메일로 POST /auth/signup 요청하여 409 EMAIL_TAKEN 응답 수신
- **THEN** 이메일 입력 필드 하단에 "✕ 이미 가입된 이메일입니다" 메시지 인라인 표시

#### Scenario: 이메일 형식 오류
- **WHEN** 유효하지 않은 이메일 형식으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }, 필드 하단 "⚠ 올바른 이메일 형식이 아닙니다" 표시

#### Scenario: 비밀번호 8자 미만
- **WHEN** 7자 이하 비밀번호로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }, 필드 하단 "⚠ 8자 이상 입력해주세요" 표시
