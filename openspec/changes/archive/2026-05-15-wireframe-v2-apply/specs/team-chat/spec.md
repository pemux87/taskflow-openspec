## MODIFIED Requirements

### Requirement: 채팅 메시지 조회 (폴링)
팀 멤버는 새 메시지를 폴링으로 수신할 수 있어야 한다(SHALL).
- 최초 진입: since 없이 최근 50건 조회.
- 이후: since=<마지막 메시지 created_at ISO> 파라미터로 증분 조회.
- 빈 배열 응답 시 화면 변화 없음.
- 폴링 실패 시 exponential backoff를 적용해야 한다(SHALL): 기본 5초에서 실패 시 10s→20s→40s→60s(상한)로 증가.
- 재연결 성공 시 retryCount를 초기화하고 정상 폴링 간격으로 복원한다.
- 헤더에 폴링 상태를 표시해야 한다: 정상 "● 5초마다 새로고침", 실패 "⚠ 연결 끊김 · {n}초 후 재시도 ({count}회)".

#### Scenario: 최초 진입 메시지 로딩
- **WHEN** 채팅 화면 진입 시 GET /teams/{id}/messages 요청
- **THEN** 200 + 최근 50건 메시지 배열 반환 (시간 오름차순)

#### Scenario: 증분 폴링
- **WHEN** 일정 간격으로 GET /teams/{id}/messages?since=<ISO timestamp> 요청
- **THEN** 200 + since 이후 새 메시지만 반환 (없으면 [])

#### Scenario: 폴링 실패 시 exponential backoff
- **WHEN** 폴링 API 호출 실패
- **THEN** 재시도 간격이 5s→10s→20s→…→60s(최대)로 증가, 헤더에 "⚠ 연결 끊김" 표시

#### Scenario: 폴링 복구
- **WHEN** exponential backoff 중 폴링 성공
- **THEN** retryCount 초기화, 정상 간격 복원, 헤더 "● 5초마다 새로고침" 복원

#### Scenario: 빈 채팅방
- **WHEN** 메시지 0건인 팀의 채팅 조회
- **THEN** 200 + [] 반환, 클라이언트는 empty state 표시

### Requirement: 모바일 채팅
모바일에서는 풀스크린 채팅 화면을 제공해야 한다(SHALL).
- 키보드 활성 시 메시지 영역 자동 축소(visualViewport API).
- 입력 포커스 시 폴링 간격 5초 → 2초로 단축.
- 모바일에서 본인 메시지를 길게 누르면 삭제 컨텍스트 메뉴를 표시해야 한다(SHALL).

#### Scenario: 모바일 키보드 활성 시 레이아웃
- **WHEN** 모바일에서 입력창 탭 → 키보드 올라옴
- **THEN** 메시지 리스트 영역이 키보드 높이만큼 축소, 입력창은 키보드 위에 고정

#### Scenario: 모바일 본인 메시지 꾸욱 누르기
- **WHEN** 모바일에서 본인 메시지를 600ms 이상 길게 누름
- **THEN** 삭제 컨텍스트 메뉴 표시 (🗑 메시지 삭제)

#### Scenario: 모바일 메시지 삭제 확인
- **WHEN** 삭제 컨텍스트 메뉴에서 "🗑 메시지 삭제" 선택
- **THEN** DELETE /messages/{id} 호출, 성공 시 해당 메시지 DOM 제거
