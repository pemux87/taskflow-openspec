## ADDED Requirements

### Requirement: 팀 생성
인증된 사용자는 팀을 생성할 수 있어야 한다(SHALL).
- 생성자는 자동으로 owner가 된다.
- 서버는 ^[A-Z]{4}-[0-9]{4}$ 형식의 초대코드를 자동 생성한다.
- 생성 즉시 users.team_id가 해당 팀 id로 업데이트된다.
- 팀 생성 성공 후 클라이언트는 즉시 칸반으로 이동하지 않고 초대코드 발급 화면을 표시해야 한다(SHALL).
- 초대코드 발급 화면은 팀 이름, 초대코드(복사 버튼 포함), "칸반 시작하기 →" 버튼을 포함해야 한다.

#### Scenario: 정상 팀 생성
- **WHEN** 인증된 사용자가 팀 이름(1-30자)으로 POST /teams 요청
- **THEN** 201 + { id, name, invite_code, owner_id, created_at } 반환, users.team_id 업데이트

#### Scenario: 초대코드 발급 화면 표시
- **WHEN** 팀 생성 API 201 응답 수신
- **THEN** "✓ 팀이 생성되었습니다!" + 팀 이름 + 초대코드 + 📋 복사 버튼 + "칸반 시작하기 →" 버튼 표시

#### Scenario: 초대코드 복사
- **WHEN** 📋 복사 버튼 클릭
- **THEN** 초대코드가 클립보드에 복사되고 버튼이 일시적으로 "✓"로 변경

#### Scenario: 팀 이름 길이 초과
- **WHEN** 30자를 초과하는 팀 이름으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

#### Scenario: 이미 팀 소속인 사용자
- **WHEN** team_id가 이미 존재하는 사용자가 POST /teams 요청
- **THEN** 409 + { error: { code: "ALREADY_IN_TEAM" } }

### Requirement: 초대코드로 팀 합류
미가입 사용자는 초대코드를 입력해 팀에 합류할 수 있어야 한다(SHALL).
- 초대코드는 ^[A-Z]{4}-[0-9]{4}$ 형식을 클라이언트와 서버 양쪽에서 검증한다.
- 합류 성공 시 users.team_id가 업데이트된다.
- 합류 확인 후 클라이언트는 즉시 칸반으로 이동하지 않고 팀 미리보기 화면을 표시해야 한다(SHALL).
- 팀 미리보기 화면은 팀 이름, 멤버 수, "이 팀에 합류 →" 버튼을 포함해야 한다.

#### Scenario: 정상 합류
- **WHEN** 유효한 초대코드로 POST /teams/join 요청
- **THEN** 200 + { team: { id, name, member_count }, redirect: "/teams/{id}" } 반환

#### Scenario: 팀 미리보기 화면 표시
- **WHEN** 합류 API 200 응답 수신
- **THEN** "✓ {팀명} 팀이 확인되었습니다" + 팀 이름 + 멤버 수 + "이 팀에 합류 →" 버튼 표시

#### Scenario: 초대코드 형식 오류
- **WHEN** ^[A-Z]{4}-[0-9]{4}$ 형식이 아닌 코드로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }, "⚠ 형식이 올바르지 않습니다 (예: FRNT-2026)" 표시

#### Scenario: 존재하지 않는 초대코드
- **WHEN** 형식은 맞지만 DB에 없는 코드로 요청
- **THEN** 404 + { error: { code: "NOT_FOUND" } }, "⚠ 해당 초대코드를 찾을 수 없습니다" 표시

#### Scenario: 이미 다른 팀 소속
- **WHEN** 이미 team_id가 있는 사용자가 합류 요청
- **THEN** 409 + { error: { code: "ALREADY_IN_TEAM" } }, "⚠ 이미 다른 팀에 소속되어 있습니다" 표시

### Requirement: 팀 정보 조회
팀 멤버는 팀 정보를 조회할 수 있어야 한다(SHALL).

#### Scenario: 정상 조회
- **WHEN** 팀 멤버가 GET /teams/{id} 요청
- **THEN** 200 + { id, name, invite_code, owner_id, member_count } 반환

#### Scenario: 비멤버 접근
- **WHEN** 해당 팀의 멤버가 아닌 사용자가 요청
- **THEN** 403 + { error: { code: "FORBIDDEN" } }

### Requirement: 팀 멤버 목록 조회
팀 멤버는 팀원 목록을 조회할 수 있어야 한다(SHALL).
- owner는 ★ 표시로 구분한다.
- 각 멤버의 가입 날짜(joined_at)를 표시해야 한다(SHALL).

#### Scenario: 정상 조회
- **WHEN** 팀 멤버가 GET /teams/{id}/members 요청
- **THEN** 200 + [{ id, email, role: "owner"|"member", joined_at }] 반환

#### Scenario: 멤버 패널 날짜 표시
- **WHEN** 팀 멤버 패널 열기
- **THEN** 각 멤버의 이메일, 역할(★ owner / member), joined_at 날짜 표시

### Requirement: 팀 탈퇴
팀 멤버는 팀을 탈퇴할 수 있어야 한다(SHALL).
- 탈퇴 시 users.team_id가 NULL로 업데이트된다.
- owner는 탈퇴할 수 없다(팀 해산 범위 외).

#### Scenario: 일반 멤버 탈퇴
- **WHEN** member가 DELETE /teams/{id}/leave 요청
- **THEN** 200 + {}, users.team_id = NULL

#### Scenario: owner 탈퇴 시도
- **WHEN** owner가 DELETE /teams/{id}/leave 요청
- **THEN** 403 + { error: { code: "FORBIDDEN", message: "팀 owner는 탈퇴할 수 없습니다" } }

### Requirement: 권한 모델
모든 팀 리소스 접근은 멤버십과 역할을 검증해야 한다(SHALL).

#### Scenario: 비멤버의 팀 리소스 접근
- **WHEN** 해당 팀의 멤버가 아닌 사용자가 /teams/{id}/* 접근
- **THEN** 403 FORBIDDEN

#### Scenario: 미가입 사용자의 칸반/채팅 접근 시도
- **WHEN** team_id가 NULL인 사용자가 /teams/{id}/* 접근
- **THEN** 403 FORBIDDEN, 클라이언트는 팀 선택 화면으로 redirect
