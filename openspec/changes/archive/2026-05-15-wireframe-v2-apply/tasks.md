## 1. 인증 화면 개선 (login.js, signup.js)

- [x] 1.1 로그인 성공 시 "✓ 성공! 이동 중…" 버튼 상태 + 녹색 배경 + 400ms delay 후 redirect
- [x] 1.2 회원가입 EMAIL_TAKEN 에러를 상단 배너 → 이메일 필드 인라인 "✕ 이미 가입된 이메일입니다"로 변경
- [x] 1.3 email-err 텍스트를 동적으로 설정 가능하도록 변경 (hardcoded 제거)

## 2. 팀 선택 화면 개선 (team.js)

- [x] 2.1 팀 생성 후 즉시 redirect 제거 → 초대코드 발급 화면 표시 (팀명 + 초대코드 + 📋 복사 버튼)
- [x] 2.2 "칸반 시작하기 →" 버튼 클릭 시 #/kanban redirect
- [x] 2.3 📋 복사 버튼: clipboard API + 일시적 "✓" 피드백
- [x] 2.4 초대코드 합류 후 즉시 redirect 제거 → 팀 미리보기 화면 표시 (팀명 + 멤버 수)
- [x] 2.5 "이 팀에 합류 →" 버튼 클릭 시 #/kanban redirect
- [x] 2.6 합류 에러 코드별 인라인 메시지 분기 (NOT_FOUND, ALREADY_IN_TEAM)

## 3. 칸반 empty state (kanban.js)

- [x] 3.1 TODO 빈 컬럼: 📋 아이콘 + "카드 없음" + "+ 첫 태스크 만들기" CTA 버튼
- [x] 3.2 DOING/DONE 빈 컬럼: 📋 아이콘 + "카드 없음" + "드래그로 이동" 안내
- [x] 3.3 모바일 빈 컬럼: 📋 아이콘 + "카드 없음"

## 4. 인라인 태스크 생성 담당자 (kanban.js)

- [x] 4.1 인라인 폼에 assignee select 추가 (기본값: @me)
- [x] 4.2 멤버 목록으로 select 옵션 동적 생성 (본인 외 멤버 + 미할당)
- [x] 4.3 ✕ 취소 버튼 추가 (inline-cancel)
- [x] 4.4 saveInline()에서 assignee_id 값 읽어 API 전송

## 5. 드래그 drop zone 시각화 (kanban.js)

- [x] 5.1 window._dragEnter() 구현: 컬럼 bg-teal-50 추가 + "⬇ 여기에 놓기" div 삽입
- [x] 5.2 window._dragLeave() 구현: relatedTarget 체크 후 정리
- [x] 5.3 window._drop() 업데이트: drop zone 정리 후 API 호출
- [x] 5.4 HTML drop-zone에 ondragenter/ondragleave 연결

## 6. 태스크 모달 메타 정보 (kanban.js)

- [x] 6.1 modal HTML에 생성자/생성 시각 표시 영역 추가 (#modal-creator, #modal-created-at)
- [x] 6.2 openModal()에서 creator_id로 멤버 이메일 조회 후 표시
- [x] 6.3 created_at을 한국어 로케일로 포맷하여 표시

## 7. 커스텀 삭제 확인 다이얼로그 (kanban.js)

- [x] 7.1 confirm-dialog HTML 추가 (z-[60], ⚠ + 설명 + 취소/삭제 버튼)
- [x] 7.2 showConfirmDialog() Promise 기반 함수 구현
- [x] 7.3 modal-delete 핸들러를 confirm()에서 showConfirmDialog()로 교체

## 8. 403 화면 (kanban.js)

- [x] 8.1 module-level appRef 변수 선언, renderKanban() 진입 시 할당
- [x] 8.2 showForbiddenScreen() 함수 구현 (🚫 + 안내 + 내 팀으로 돌아가기)
- [x] 8.3 loadData() catch에서 FORBIDDEN/NOT_FOUND 코드 감지 시 showForbiddenScreen() 호출

## 9. FAB 모달 + 모바일 스와이프 (kanban.js)

- [x] 9.1 fab-modal HTML 추가 (슬라이드업 패널, 제목 입력란, 취소/추가 버튼)
- [x] 9.2 FAB 버튼 클릭 → fab-modal 열기, prompt() 제거
- [x] 9.3 fab-save 클릭 시 API 호출 후 모달 닫기
- [x] 9.4 renderMobileCol()에 touchstart/touchend 리스너 추가 (dx > 60px 컬럼 전환)

## 10. 멤버 패널 joined_at 표시 (kanban.js)

- [x] 10.1 renderMemberList()에서 m.role === 'owner' 기준으로 역할 표시
- [x] 10.2 m.joined_at을 한국어 날짜 포맷으로 표시

## 11. 채팅 exponential backoff (chat.js)

- [x] 11.1 setInterval 폴링을 setTimeout 재귀 구조(schedulePoll)로 교체
- [x] 11.2 retryCount 모듈 변수 선언, 성공 시 0 초기화, 실패 시 증가
- [x] 11.3 delay 계산: min(base * 2^(retry-1), 60000)
- [x] 11.4 loadMessages() 반환값을 boolean(성공 여부)으로 변경
- [x] 11.5 setOnline()에서 재시도 횟수 및 다음 대기 시간 표시

## 12. 모바일 꾸욱 누르기 삭제 (chat.js)

- [x] 12.1 메시지 렌더링 시 isMe인 경우 touchstart/touchend/touchmove 리스너 추가
- [x] 12.2 600ms 이상 누름 감지 시 showMsgContextMenu() 호출
- [x] 12.3 showMsgContextMenu(): 중앙 팝업 + "🗑 메시지 삭제" 버튼 + 외부 클릭 닫기
