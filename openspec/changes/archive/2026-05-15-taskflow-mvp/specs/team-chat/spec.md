## ADDED Requirements

### Requirement: 채팅 메시지 조회 (폴링)
팀 멤버는 5초마다 새 메시지를 폴링으로 수신할 수 있어야 한다(SHALL).
- 최초 진입: since 없이 최근 50건 조회.
- 이후: since=<마지막 메시지 created_at ISO> 파라미터로 증분 조회.
- 빈 배열 응답 시 화면 변화 없음.

#### Scenario: 최초 진입 메시지 로딩
- **WHEN** 채팅 화면 진입 시 GET /teams/{id}/messages 요청
- **THEN** 200 + 최근 50건 메시지 배열 반환 (시간 오름차순)

#### Scenario: 증분 폴링
- **WHEN** 5초마다 GET /teams/{id}/messages?since=<ISO timestamp> 요청
- **THEN** 200 + since 이후 새 메시지만 반환 (없으면 [])

#### Scenario: 빈 채팅방
- **WHEN** 메시지 0건인 팀의 채팅 조회
- **THEN** 200 + [] 반환, 클라이언트는 empty state 표시

### Requirement: 메시지 전송
팀 멤버는 1000자 이내의 메시지를 전송할 수 있어야 한다(SHALL).
- 클라이언트와 서버 양쪽에서 1000자 제한을 검증한다.

#### Scenario: 정상 전송
- **WHEN** 팀 멤버가 1000자 이내 content로 POST /teams/{id}/messages 요청
- **THEN** 201 + { id, user_id, user_email, content, created_at } 반환

#### Scenario: 1000자 초과
- **WHEN** 1000자를 초과하는 content로 요청
- **THEN** 400 + { error: { code: "TOO_LONG", limit: 1000, actual: <실제길이> } }

#### Scenario: 클라이언트 실시간 카운터
- **WHEN** 입력창에 글자 입력 중 1000자 초과 시
- **THEN** 카운터 적색 표시, 전송 버튼 비활성화

### Requirement: 메시지 삭제
본인 메시지만 삭제할 수 있어야 한다(SHALL). owner도 타인 메시지를 삭제할 수 없다.

#### Scenario: 본인 메시지 삭제
- **WHEN** 메시지 작성자가 DELETE /messages/{id} 요청
- **THEN** 204 No Content

#### Scenario: 타인 메시지 삭제 시도
- **WHEN** 메시지 작성자가 아닌 사용자(owner 포함)가 DELETE /messages/{id} 요청
- **THEN** 403 + { error: { code: "NOT_OWNER", message: "본인의 메시지만 삭제할 수 있습니다" } }

#### Scenario: 호버 삭제 UI
- **WHEN** 본인 메시지에 마우스 호버
- **THEN** 삭제 아이콘(🗑) 표시, 타인 메시지에는 아이콘 없음

### Requirement: 메시지 누락 없음
POST 성공(201)한 메시지는 이후 모든 GET에서 반드시 조회되어야 한다(SHALL).

#### Scenario: 전송 후 폴링 시 메시지 존재
- **WHEN** POST /teams/{id}/messages → 201 성공 후 GET /teams/{id}/messages 폴링
- **THEN** 해당 메시지가 응답에 포함됨

### Requirement: 모바일 채팅
모바일에서는 풀스크린 채팅 화면을 제공해야 한다(SHALL).
- 키보드 활성 시 메시지 영역 자동 축소(visualViewport API).
- 입력 포커스 시 폴링 간격 5초 → 2초로 단축.
- pull-to-refresh로 강제 동기화 지원.

#### Scenario: 모바일 키보드 활성 시 레이아웃
- **WHEN** 모바일에서 입력창 탭 → 키보드 올라옴
- **THEN** 메시지 리스트 영역이 키보드 높이만큼 축소, 입력창은 키보드 위에 고정

#### Scenario: 모바일 메시지 삭제
- **WHEN** 모바일에서 본인 메시지를 길게 누름
- **THEN** 삭제 메뉴 표시
