## ADDED Requirements

### Requirement: 칸반 태스크 목록 조회
팀 멤버는 팀의 태스크를 3컬럼(TODO/DOING/DONE)으로 조회할 수 있어야 한다(SHALL).
- 기본 정렬: created_at DESC
- 필터: 전체(기본) / @me(assignee_id=나) / 미할당(assignee_id IS NULL)

#### Scenario: 전체 태스크 조회
- **WHEN** 팀 멤버가 GET /teams/{id}/tasks 요청
- **THEN** 200 + [{ id, title, status, creator_id, assignee_id, created_at }] 반환

#### Scenario: 내 태스크 필터
- **WHEN** GET /teams/{id}/tasks?filter=me 요청
- **THEN** assignee_id = current_user_id 인 태스크만 반환

#### Scenario: 미할당 필터
- **WHEN** GET /teams/{id}/tasks?filter=unassigned 요청
- **THEN** assignee_id IS NULL 인 태스크만 반환

#### Scenario: 빈 칸반
- **WHEN** 태스크가 0건인 팀의 목록 조회
- **THEN** 200 + [] 반환

### Requirement: 태스크 생성
팀 멤버는 TODO 컬럼에 새 태스크를 추가할 수 있어야 한다(SHALL).
- 초기 status는 항상 TODO.
- assignee_id는 nullable(미할당 가능).

#### Scenario: 정상 생성
- **WHEN** 팀 멤버가 제목(1-100자)으로 POST /teams/{id}/tasks 요청
- **THEN** 201 + { id, title, status: "TODO", creator_id, assignee_id, created_at }

#### Scenario: 제목 길이 초과
- **WHEN** 100자를 초과하는 제목으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

### Requirement: 태스크 상태 변경 (드래그)
팀 멤버는 태스크를 드래그하여 TODO/DOING/DONE 간 상태를 변경할 수 있어야 한다(SHALL).
- 드래그 drop 시 PATCH /tasks/{id}/status 호출.

#### Scenario: 정상 상태 변경
- **WHEN** 팀 멤버가 { status: "DOING" }으로 PATCH /tasks/{id}/status 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 유효하지 않은 상태값
- **WHEN** TODO/DOING/DONE 외 값으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

### Requirement: 태스크 수정
팀 멤버는 태스크 제목과 담당자를 수정할 수 있어야 한다(SHALL).

#### Scenario: 제목 수정
- **WHEN** 팀 멤버가 { title: "새 제목" }으로 PUT /tasks/{id} 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 담당자 지정
- **WHEN** { assignee_id: userId }로 PUT /tasks/{id} 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 담당자 해제
- **WHEN** { assignee_id: null }로 PUT /tasks/{id} 요청
- **THEN** 200 + assignee_id가 null인 태스크 반환

### Requirement: 태스크 삭제
creator 또는 team owner만 태스크를 삭제할 수 있어야 한다(SHALL).

#### Scenario: creator가 본인 태스크 삭제
- **WHEN** creator_id = current_user_id인 태스크에 DELETE /tasks/{id} 요청
- **THEN** 204 No Content

#### Scenario: owner가 타인 태스크 삭제
- **WHEN** team owner가 타인이 생성한 태스크에 DELETE /tasks/{id} 요청
- **THEN** 204 No Content

#### Scenario: 비권한자 삭제 시도
- **WHEN** creator도 owner도 아닌 멤버가 DELETE /tasks/{id} 요청
- **THEN** 403 + { error: { code: "FORBIDDEN" } }

### Requirement: 모바일 칸반
모바일(<768px)에서는 1컬럼 스와이프 방식으로 칸반을 제공해야 한다(SHALL).
- 드래그 대신 길게 누르기(long press) → 상태 선택 메뉴로 이동.
- FAB(+) 버튼으로 태스크 추가.

#### Scenario: 모바일에서 컬럼 전환
- **WHEN** 모바일 화면에서 좌우 스와이프
- **THEN** TODO → DOING → DONE 컬럼 전환, 상단 인디케이터 업데이트

#### Scenario: 모바일에서 상태 변경
- **WHEN** 카드를 길게 누름
- **THEN** TODO/DOING/DONE 선택 메뉴 표시, 선택 시 PATCH /tasks/{id}/status 호출
