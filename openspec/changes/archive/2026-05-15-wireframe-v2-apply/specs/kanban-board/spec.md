## ADDED Requirements

### Requirement: 비멤버 접근 403 화면
비멤버가 팀 칸반에 접근하면 전용 403 화면을 표시해야 한다(SHALL).

#### Scenario: 403 화면 표시
- **WHEN** loadData 호출 시 FORBIDDEN 에러 수신
- **THEN** 🚫 아이콘 + "403" + "이 팀에 접근할 권한이 없습니다" + "내 팀으로 돌아가기" 버튼 전체 화면 표시

#### Scenario: 내 팀으로 돌아가기
- **WHEN** 403 화면에서 "내 팀으로 돌아가기" 버튼 클릭
- **THEN** 팀 선택 화면(#/team)으로 redirect

## MODIFIED Requirements

### Requirement: 칸반 태스크 목록 조회
팀 멤버는 팀의 태스크를 3컬럼(TODO/DOING/DONE)으로 조회할 수 있어야 한다(SHALL).
- 기본 정렬: created_at DESC
- 필터: 전체(기본) / @me(assignee_id=나) / 미할당(assignee_id IS NULL)
- 태스크가 0건인 컬럼에는 empty state를 표시해야 한다(SHALL).
- TODO 빈 컬럼은 📋 아이콘 + "첫 태스크 만들기" CTA를 표시한다.
- DOING/DONE 빈 컬럼은 📋 아이콘 + "드래그로 이동" 안내를 표시한다.

#### Scenario: 전체 태스크 조회
- **WHEN** 팀 멤버가 GET /teams/{id}/tasks 요청
- **THEN** 200 + [{ id, title, status, creator_id, assignee_id, created_at }] 반환

#### Scenario: 빈 TODO 컬럼 empty state
- **WHEN** TODO 컬럼에 태스크가 0건
- **THEN** 📋 아이콘 + "카드 없음" + "+ 첫 태스크 만들기" 버튼 표시

#### Scenario: 빈 DOING/DONE 컬럼 empty state
- **WHEN** DOING 또는 DONE 컬럼에 태스크가 0건
- **THEN** 📋 아이콘 + "카드 없음" + "드래그로 이동" 안내 표시

#### Scenario: 내 태스크 필터
- **WHEN** GET /teams/{id}/tasks?filter=me 요청
- **THEN** assignee_id = current_user_id 인 태스크만 반환

#### Scenario: 미할당 필터
- **WHEN** GET /teams/{id}/tasks?filter=unassigned 요청
- **THEN** assignee_id IS NULL 인 태스크만 반환

### Requirement: 태스크 생성
팀 멤버는 TODO 컬럼에 새 태스크를 추가할 수 있어야 한다(SHALL).
- 초기 status는 항상 TODO.
- assignee_id는 nullable(미할당 가능).
- 인라인 생성 폼은 제목 입력란과 담당자 드롭다운을 포함해야 한다(SHALL).
- 담당자 드롭다운의 기본값은 현재 사용자(@me)이다.

#### Scenario: 정상 생성
- **WHEN** 팀 멤버가 제목(1-100자)으로 POST /teams/{id}/tasks 요청
- **THEN** 201 + { id, title, status: "TODO", creator_id, assignee_id, created_at }

#### Scenario: 인라인 폼 담당자 선택
- **WHEN** + 버튼 클릭 → 인라인 폼 표시
- **THEN** 제목 입력란 + 담당자 드롭다운(기본: @me) + Enter 저장 + Esc 취소

#### Scenario: 제목 길이 초과
- **WHEN** 100자를 초과하는 제목으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

### Requirement: 태스크 상태 변경 (드래그)
팀 멤버는 태스크를 드래그하여 TODO/DOING/DONE 간 상태를 변경할 수 있어야 한다(SHALL).
- 드래그 drop 시 PATCH /tasks/{id}/status 호출.
- 드래그 중 대상 컬럼은 시각적으로 하이라이트되고 "⬇ 여기에 놓기" 인디케이터가 표시되어야 한다(SHALL).

#### Scenario: 정상 상태 변경
- **WHEN** 팀 멤버가 { status: "DOING" }으로 PATCH /tasks/{id}/status 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 드래그 중 drop zone 시각화
- **WHEN** 카드를 드래그하여 컬럼 위에 올림
- **THEN** 해당 컬럼 배경 하이라이트 + "⬇ 여기에 놓기" 텍스트 표시

#### Scenario: 유효하지 않은 상태값
- **WHEN** TODO/DOING/DONE 외 값으로 요청
- **THEN** 400 + { error: { code: "VALIDATION_ERROR" } }

### Requirement: 태스크 수정
팀 멤버는 태스크 제목과 담당자를 수정할 수 있어야 한다(SHALL).
- 태스크 모달에는 생성자 이메일과 생성 시각 메타 정보를 표시해야 한다(SHALL).

#### Scenario: 제목 수정
- **WHEN** 팀 멤버가 { title: "새 제목" }으로 PUT /tasks/{id} 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 모달 메타 정보 표시
- **WHEN** 태스크 카드 클릭 → 모달 열기
- **THEN** 제목/상태/담당자 외 생성자(@email) + 생성 시각 표시

#### Scenario: 담당자 지정
- **WHEN** { assignee_id: userId }로 PUT /tasks/{id} 요청
- **THEN** 200 + 업데이트된 태스크 반환

#### Scenario: 담당자 해제
- **WHEN** { assignee_id: null }로 PUT /tasks/{id} 요청
- **THEN** 200 + assignee_id가 null인 태스크 반환

### Requirement: 태스크 삭제
creator 또는 team owner만 태스크를 삭제할 수 있어야 한다(SHALL).
- 삭제 전 브라우저 기본 confirm() 대신 커스텀 확인 다이얼로그를 표시해야 한다(SHALL).
- 다이얼로그는 ⚠ 아이콘 + 카드 정보 + 취소/삭제 버튼을 포함한다.

#### Scenario: creator가 본인 태스크 삭제
- **WHEN** creator_id = current_user_id인 태스크에 DELETE /tasks/{id} 요청
- **THEN** 204 No Content

#### Scenario: 커스텀 삭제 확인 다이얼로그
- **WHEN** 삭제 버튼 클릭
- **THEN** ⚠ + "이 카드를 삭제하시겠습니까?" + 카드 제목 + 취소/삭제 버튼 표시

#### Scenario: owner가 타인 태스크 삭제
- **WHEN** team owner가 타인이 생성한 태스크에 DELETE /tasks/{id} 요청
- **THEN** 204 No Content

#### Scenario: 비권한자 삭제 시도
- **WHEN** creator도 owner도 아닌 멤버가 DELETE /tasks/{id} 요청
- **THEN** 403 + { error: { code: "FORBIDDEN" } }

### Requirement: 모바일 칸반
모바일(<768px)에서는 1컬럼 스와이프 방식으로 칸반을 제공해야 한다(SHALL).
- 드래그 대신 길게 누르기(long press) → 상태 선택 메뉴로 이동.
- FAB(+) 버튼은 슬라이드업 모달을 통해 태스크를 추가해야 한다(SHALL). 브라우저 prompt() 사용 금지.
- 좌우 스와이프 제스처(60px 이상)로 컬럼을 전환할 수 있어야 한다(SHALL).

#### Scenario: 모바일에서 스와이프 컬럼 전환
- **WHEN** 모바일 화면에서 60px 이상 좌우 스와이프
- **THEN** TODO → DOING → DONE 컬럼 전환, 상단 탭 인디케이터 업데이트

#### Scenario: FAB 태스크 추가 모달
- **WHEN** 우하단 FAB(+) 버튼 클릭
- **THEN** 슬라이드업 모달에 제목 입력란 표시, Enter 또는 추가 버튼으로 저장

#### Scenario: 모바일에서 상태 변경
- **WHEN** 카드를 길게 누름
- **THEN** TODO/DOING/DONE 선택 메뉴 표시, 선택 시 PATCH /tasks/{id}/status 호출
