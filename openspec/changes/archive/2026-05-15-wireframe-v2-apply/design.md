## Context

TaskFlow MVP는 FastAPI 백엔드 + Vanilla JS 프론트엔드로 구성된다. 프론트엔드는 5개의 뷰 모듈(login.js, signup.js, team.js, kanban.js, chat.js)로 분리되어 있으며, 각 뷰는 `app.innerHTML`을 통해 SPA 방식으로 교체된다. 스토리보드 v2 문서(42슬라이드)가 UI 설계의 기준이며, 이번 변경은 해당 문서와 구현 간의 차이를 해소한다.

## Goals / Non-Goals

**Goals:**
- 스토리보드 v2에 정의된 15개 화면 상태·인터랙션을 코드에 반영
- 백엔드 API 변경 없이 프론트엔드 레이어만 수정
- 기존 기능 동작 유지 (회귀 없음)

**Non-Goals:**
- 새로운 API 엔드포인트 추가
- WebSocket / 실시간 통신 도입
- 디자인 시스템 재설계

## Decisions

**D1. 팀 생성/합류 후 중간 화면 삽입 (C·02, C·03)**
- 방식: `location.hash` redirect를 즉시 호출하지 않고, 성공 응답 수신 후 해당 패널의 innerHTML을 결과 화면으로 교체
- Auth.save()는 중간 화면 진입 전에 미리 호출하여 토큰을 보존
- 이유: 사용자가 초대코드를 복사하거나 팀 정보를 확인할 시간이 필요

**D2. 커스텀 삭제 확인 다이얼로그 (D·06)**
- 방식: Promise 기반 `showConfirmDialog()` 함수, 확인/취소 버튼 클릭 시 resolve
- 브라우저 `confirm()`을 제거하고 Tailwind 스타일 모달로 교체
- z-index `z-[60]`으로 task-modal(`z-50`) 위에 렌더링

**D3. 드래그 drop zone 시각화 (D·04)**
- 방식: `ondragenter` 이벤트에서 컬럼 배경색 추가 + 동적으로 "⬇ 여기에 놓기" div 삽입
- `ondragleave`에서 `e.relatedTarget`이 해당 컬럼 외부일 때만 제거 (자식 요소 진입 시 깜빡임 방지)
- `ondrop`에서 정리 후 API 호출

**D4. Exponential backoff 폴링 (E·04)**
- 방식: `setInterval` → `setTimeout` 재귀 구조로 전환
- 성공 시 retryCount 초기화, 실패 시 증가: `delay = min(base * 2^(retry-1), 60000)`
- 포커스 여부(`isFocused`)에 따라 base를 2000ms / 5000ms로 분기

**D5. 모바일 스와이프 (F·01)**
- 방식: `touchstart`/`touchend` 이벤트, dx > 60px 임계값으로 컬럼 전환
- `renderMobileCol()` 호출 시마다 이벤트 리스너를 재등록 (innerHTML 교체 후 리스너 소실 문제 해소)

**D6. 403 화면 (D·07)**
- 방식: `loadData()` catch에서 `FORBIDDEN` / `NOT_FOUND` 코드 감지 시 `appRef.innerHTML`을 전체 교체
- `appRef`를 module-level 변수로 유지하여 `loadData`에서 접근

## Risks / Trade-offs

- **renderMobileCol 리스너 재등록**: 스와이프 리스너를 매번 재등록하므로 메모리 누수 가능 → `{ passive: true }` 사용, 화면 전환 시 자연스럽게 정리됨 (innerHTML 교체)
- **confirm-dialog z-index 충돌**: 다른 모달과 z-index 경쟁 가능 → task-modal(z-50)보다 높은 z-[60] 명시 적용
- **팀 합류 미리보기 후 취소 경로 없음**: 스토리보드 미정의 케이스 → Auth.save() 이미 완료된 상태이므로 뒤로가기 시 자동으로 칸반으로 이동 (허용 가능 트레이드오프)

## Migration Plan

- 백엔드 변경 없음, 프론트엔드 5개 파일 교체만으로 완료
- 기존 API 응답 구조 의존: `TaskOut.creator_id`, `TaskOut.created_at`, `MemberOut.role`, `MemberOut.joined_at` 필드 활용
