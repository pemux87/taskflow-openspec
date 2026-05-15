import { api } from '../api.js';
import { Auth } from '../auth.js';

const STATUSES = ['TODO', 'DOING', 'DONE'];
const LABELS = { TODO: 'TODO', DOING: 'DOING', DONE: 'DONE' };
const COL_BG = { TODO: 'bg-yellow-50 text-yellow-800', DOING: 'bg-blue-50 text-blue-800', DONE: 'bg-green-50 text-green-800' };

let tasks = [], members = [], currentFilter = 'all', mobileCol = 0;
let appRef = null, teamIdRef = null;

export async function renderKanban(app) {
  appRef = app;
  const user = Auth.user();
  teamIdRef = user?.team_id;

  app.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex flex-col">
      <!-- 헤더 -->
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-teal-600 text-white px-3 py-1 rounded font-bold text-sm">TaskFlow</div>
          <span id="team-name" class="text-gray-700 text-sm font-medium hidden md:block"></span>
        </div>
        <nav class="hidden md:flex gap-1">
          <a href="#/kanban" class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-medium">칸반</a>
          <a href="#/chat" class="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">채팅</a>
          <button id="members-btn" class="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">멤버</button>
        </nav>
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500 hidden md:block">${escHtml(user?.email || '')}</span>
          <button id="logout-btn" class="text-sm text-gray-400 hover:text-gray-600 hidden md:block">로그아웃</button>
          <button id="hamburger" class="md:hidden p-2 text-gray-600">☰</button>
        </div>
      </header>

      <!-- 모바일 메뉴 -->
      <div id="mobile-menu" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40" onclick="this.classList.add('hidden')">
        <div class="absolute right-0 top-0 h-full w-64 bg-white shadow-xl" onclick="event.stopPropagation()">
          <div class="p-4 border-b flex items-center gap-3">
            <div class="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
              ${(user?.email || 'U')[0].toUpperCase()}
            </div>
            <p class="text-sm font-medium text-gray-800">${escHtml(user?.email || '')}</p>
          </div>
          <nav class="p-4 space-y-1">
            <a href="#/kanban" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center gap-3 px-3 py-2.5 bg-gray-100 rounded-lg text-sm font-medium text-gray-800">📋 칸반</a>
            <a href="#/chat" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700">💬 채팅</a>
            <button id="mob-members" class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700">👥 팀 멤버</button>
            <button id="mob-logout" class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700">🚪 로그아웃</button>
          </nav>
        </div>
      </div>

      <!-- 필터 -->
      <div class="bg-white border-b px-4 py-2 flex items-center gap-2">
        <button data-filter="all" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-white">전체</button>
        <button data-filter="me" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">@me</button>
        <button data-filter="unassigned" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">미할당</button>
        <span class="ml-auto text-xs text-gray-400 hidden md:block">정렬: 최근 생성순 ▼</span>
      </div>

      <!-- 모바일 컬럼 탭 -->
      <div class="md:hidden flex border-b bg-white">
        ${STATUSES.map((s, i) => `
          <button data-col="${i}" class="col-tab flex-1 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}">
            ${LABELS[s]}
          </button>`).join('')}
      </div>

      <!-- 칸반 보드 -->
      <div class="flex-1 p-4 overflow-auto">
        <div class="hidden md:grid md:grid-cols-3 gap-4" id="kanban-desktop"></div>
        <div class="md:hidden" id="kanban-mobile"></div>
      </div>

      <!-- 모바일 FAB -->
      <button id="fab-btn" class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-teal-700 z-40">+</button>

      <!-- 멤버 패널 -->
      <div id="member-panel" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40" onclick="this.classList.add('hidden')">
        <div class="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-6 overflow-y-auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold text-gray-800" id="member-count">팀 멤버</h2>
            <button onclick="document.getElementById('member-panel').classList.add('hidden')" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div id="member-list" class="space-y-3"></div>
        </div>
      </div>

      <!-- 태스크 모달 -->
      <div id="task-modal" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-4">
            <span id="modal-id" class="text-gray-400 text-sm"></span>
            <button id="modal-close" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <input type="text" id="modal-title" class="w-full border-b border-gray-300 text-lg font-semibold pb-2 mb-4 focus:outline-none focus:border-teal-500" />
          <div class="mb-4">
            <label class="text-sm text-gray-500 mb-2 block">상태</label>
            <div class="flex gap-2">
              ${STATUSES.map(s => `<button data-status="${s}" class="status-btn flex-1 py-1.5 rounded border text-sm font-medium">${s}</button>`).join('')}
            </div>
          </div>
          <div class="mb-4">
            <label class="text-sm text-gray-500 mb-2 block">담당자</label>
            <select id="modal-assignee" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">미할당</option>
            </select>
          </div>
          <div class="mb-4 text-sm space-y-1.5 bg-gray-50 rounded-lg p-3">
            <div class="flex gap-2"><span class="text-gray-400 w-16 shrink-0">생성자</span><span id="modal-creator" class="text-gray-700 text-xs"></span></div>
            <div class="flex gap-2"><span class="text-gray-400 w-16 shrink-0">생성 시각</span><span id="modal-created-at" class="text-gray-700 text-xs"></span></div>
          </div>
          <div class="flex gap-2 mt-4">
            <button id="modal-save" class="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700">저장</button>
            <button id="modal-delete" class="px-4 bg-red-50 text-red-600 rounded-lg py-2 text-sm font-semibold hover:bg-red-100 hidden">🗑 삭제</button>
          </div>
        </div>
      </div>

      <!-- D·06: 삭제 확인 다이얼로그 -->
      <div id="confirm-dialog" class="hidden fixed inset-0 z-[60] bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm text-center" onclick="event.stopPropagation()">
          <div class="text-3xl mb-3">⚠</div>
          <h3 class="font-bold text-gray-800 mb-2">이 카드를 삭제하시겠습니까?</h3>
          <p id="confirm-desc" class="text-gray-500 text-sm mb-6 break-all"></p>
          <div class="flex gap-3">
            <button id="confirm-cancel" class="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">취소</button>
            <button id="confirm-ok" class="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">삭제</button>
          </div>
        </div>
      </div>

      <!-- FAB 태스크 추가 모달 -->
      <div id="fab-modal" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40 flex items-end justify-center md:items-center">
        <div class="bg-white w-full md:max-w-sm rounded-t-2xl md:rounded-2xl shadow-xl p-6" onclick="event.stopPropagation()">
          <h3 class="font-bold text-gray-800 mb-4">태스크 추가</h3>
          <input id="fab-input" type="text" maxlength="100" placeholder="태스크 제목..."
            class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <div class="flex gap-2">
            <button id="fab-cancel" class="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">취소</button>
            <button id="fab-save" class="flex-1 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700">추가</button>
          </div>
        </div>
      </div>
    </div>`;

  await loadData(teamIdRef);
  setupEvents(teamIdRef);
}

// ── 데이터 로드 ──────────────────────────────────────────────────────────────

async function loadData(teamId) {
  try {
    const [t, m, team] = await Promise.all([
      api.get(`/api/teams/${teamId}/tasks${currentFilter !== 'all' ? `?filter=${currentFilter}` : ''}`),
      api.get(`/api/teams/${teamId}/members`),
      api.get(`/api/teams/${teamId}`),
    ]);
    tasks = t;
    members = m;
    const nameEl = document.getElementById('team-name');
    if (nameEl) nameEl.textContent = team.name + ' 팀';
    renderBoard();
    renderMemberList();
  } catch (err) {
    if (err?.error?.code === 'FORBIDDEN' || err?.error?.code === 'NOT_FOUND') {
      showForbiddenScreen();
    }
  }
}

// D·07: 403 화면
function showForbiddenScreen() {
  if (!appRef) return;
  appRef.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div class="text-center max-w-sm">
        <div class="text-6xl mb-4">🚫</div>
        <h1 class="text-5xl font-bold text-gray-700 mb-3">403</h1>
        <p class="text-gray-700 font-semibold mb-2">이 팀에 접근할 권한이 없습니다</p>
        <p class="text-gray-400 text-sm mb-6">당신은 이 팀의 멤버가 아닙니다.<br>초대코드를 받았다면 팀 선택 화면에서 입력하세요.</p>
        <button onclick="location.hash='#/team'"
          class="bg-teal-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-700 transition">
          내 팀으로 돌아가기
        </button>
      </div>
    </div>`;
}

// ── 렌더링 ───────────────────────────────────────────────────────────────────

function renderBoard() {
  renderDesktop();
  renderMobileCol();
}

function renderDesktop() {
  const el = document.getElementById('kanban-desktop');
  if (!el) return;
  const user = Auth.user();
  el.innerHTML = STATUSES.map(s => {
    const colTasks = tasks.filter(t => t.status === s);
    const emptyHtml = s === 'TODO'
      ? `<div class="flex flex-col items-center justify-center py-10 text-center">
           <div class="text-4xl mb-3">📋</div>
           <p class="text-gray-400 text-sm mb-3">카드 없음</p>
           <button class="add-empty-btn text-teal-600 text-sm hover:underline font-medium" data-add="TODO">+ 첫 태스크 만들기</button>
         </div>`
      : `<div class="flex flex-col items-center justify-center py-10 text-center">
           <div class="text-4xl mb-3">📋</div>
           <p class="text-gray-400 text-sm mb-1">카드 없음</p>
           <p class="text-gray-300 text-xs">드래그로 이동</p>
         </div>`;
    return `
      <div class="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden min-h-48">
        <div class="px-4 py-3 font-bold text-sm flex items-center justify-between ${COL_BG[s]}">
          <span>${LABELS[s]} · ${colTasks.length}</span>
          <button data-add="${s}" class="add-col-btn text-xl font-light hover:opacity-70 leading-none">+</button>
        </div>
        <div class="flex-1 p-3 space-y-2 drop-zone transition-colors rounded-b-xl" data-col="${s}"
          ondragover="event.preventDefault()"
          ondragenter="window._dragEnter(this)"
          ondragleave="window._dragLeave(event,this)"
          ondrop="window._drop(event,'${s}',this)">
          ${colTasks.length === 0 ? emptyHtml : colTasks.map(t => taskCard(t)).join('')}
          <div id="inline-${s}" class="hidden">
            <div class="bg-gray-50 border border-teal-200 rounded-lg p-3">
              <input type="text" class="inline-input w-full border border-gray-200 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white" placeholder="태스크 제목..." maxlength="100" />
              <select class="inline-assignee w-full border border-gray-200 rounded px-2 py-1.5 text-sm mb-2 focus:outline-none bg-white">
                <option value="${user?.id}">@me (나)</option>
                ${members.filter(m => m.id !== user?.id).map(m => `<option value="${m.id}">@${escHtml(m.email.split('@')[0])}</option>`).join('')}
                <option value="">미할당</option>
              </select>
              <div class="flex items-center justify-between text-xs text-gray-400">
                <span>Enter: 저장 · Esc: 취소</span>
                <button class="inline-cancel text-gray-400 hover:text-gray-600 ml-2">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
  addCardListeners();
}

function renderMobileCol() {
  const el = document.getElementById('kanban-mobile');
  if (!el) return;
  const s = STATUSES[mobileCol];
  const colTasks = tasks.filter(t => t.status === s);
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 font-bold text-sm flex items-center justify-between ${COL_BG[s]}">
        ${LABELS[s]} · ${colTasks.length}
      </div>
      <div class="p-3 space-y-2">
        ${colTasks.length === 0
          ? `<div class="flex flex-col items-center justify-center py-8 text-center">
               <div class="text-3xl mb-2">📋</div>
               <p class="text-gray-400 text-sm">카드 없음</p>
             </div>`
          : colTasks.map(t => taskCard(t, true)).join('')}
      </div>
    </div>`;
  addCardListeners();

  // F·01: 모바일 스와이프
  let touchStartX = 0;
  el.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 60) {
      const newCol = dx < 0 ? Math.min(mobileCol + 1, 2) : Math.max(mobileCol - 1, 0);
      if (newCol !== mobileCol) {
        mobileCol = newCol;
        document.querySelectorAll('.col-tab').forEach((tab, i) => {
          tab.className = `col-tab flex-1 py-2 text-sm font-medium border-b-2 ${i === mobileCol ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`;
        });
        renderMobileCol();
      }
    }
  }, { passive: true });
}

function taskCard(t, mobile = false) {
  const assignee = members.find(m => m.id === t.assignee_id);
  return `
    <div class="task-card bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-teal-400 hover:shadow-sm transition select-none"
      data-id="${t.id}" ${!mobile ? `draggable="true" ondragstart="window._dragStart(event,'${t.id}')"` : ''}>
      <p class="text-sm font-medium text-gray-800 mb-1.5">${escHtml(t.title)}</p>
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <span>#${t.id}</span>
        ${t.assignee_id
          ? `<span class="text-teal-600">@${escHtml(assignee?.email?.split('@')[0] || '?')}</span>`
          : '<span class="bg-orange-50 text-orange-400 px-1.5 py-0.5 rounded text-xs">⚠ 미할당</span>'}
      </div>
    </div>`;
}

function renderMemberList() {
  const el = document.getElementById('member-list');
  const cnt = document.getElementById('member-count');
  if (!el || !cnt) return;
  cnt.textContent = `팀 멤버 (${members.length})`;
  const user = Auth.user();
  el.innerHTML = members.map(m => {
    const isOwner = m.role === 'owner';
    const isMe = m.id === user?.id;
    const date = m.joined_at ? new Date(m.joined_at).toLocaleDateString('ko-KR') : '';
    return `
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
          ${m.email[0].toUpperCase()}
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate">${escHtml(m.email)}${isMe ? ' <span class="text-gray-400 font-normal text-xs">(나)</span>' : ''}</p>
          <p class="text-xs ${isOwner ? 'text-yellow-600 font-semibold' : 'text-gray-400'}">${isOwner ? '★ owner' : 'member'}</p>
          ${date ? `<p class="text-xs text-gray-300">${date}</p>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ── 카드 이벤트 ──────────────────────────────────────────────────────────────

function addCardListeners() {
  document.querySelectorAll('.task-card').forEach(el => {
    el.addEventListener('click', () => openModal(parseInt(el.dataset.id)));
    let lt;
    el.addEventListener('touchstart', () => { lt = setTimeout(() => openStatusMenu(parseInt(el.dataset.id)), 600); }, { passive: true });
    el.addEventListener('touchend', () => clearTimeout(lt), { passive: true });
    el.addEventListener('touchmove', () => clearTimeout(lt), { passive: true });
  });
  document.querySelectorAll('.add-col-btn, .add-empty-btn').forEach(btn => {
    btn.addEventListener('click', () => showInline(btn.dataset.add));
  });
  document.querySelectorAll('.inline-input').forEach(inp => {
    inp.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') await saveInline(inp);
      if (e.key === 'Escape') hideInline(inp.closest('[id^=inline-]'));
    });
  });
  document.querySelectorAll('.inline-cancel').forEach(btn => {
    btn.addEventListener('click', () => hideInline(btn.closest('[id^=inline-]')));
  });
}

function showInline(status) {
  const el = document.getElementById(`inline-${status}`);
  if (!el) return;
  el.classList.remove('hidden');
  el.querySelector('input')?.focus();
}

function hideInline(el) {
  el?.classList.add('hidden');
  const inp = el?.querySelector('input');
  if (inp) inp.value = '';
}

async function saveInline(inp) {
  const title = inp.value.trim();
  const container = inp.closest('[id^=inline-]');
  const status = container?.id.replace('inline-', '');
  if (!title || !status) return;
  const assigneeVal = container?.querySelector('.inline-assignee')?.value;
  const assignee_id = assigneeVal ? parseInt(assigneeVal) : null;
  try {
    await api.post(`/api/teams/${teamIdRef}/tasks`, { title, assignee_id });
    await loadData(teamIdRef);
  } catch {}
}

// ── 모달 ─────────────────────────────────────────────────────────────────────

function openModal(taskId) {
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  const user = Auth.user();
  const isOwner = members.find(m => m.id === user?.id)?.role === 'owner';
  const canDelete = t.creator_id === user?.id || isOwner;
  const creator = members.find(m => m.id === t.creator_id);
  const creatorText = creator
    ? `@${creator.email.split('@')[0]} (${creator.email})`
    : `#${t.creator_id}`;
  const createdAt = t.created_at
    ? new Date(t.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '';

  document.getElementById('modal-id').textContent = `#${t.id}`;
  document.getElementById('modal-title').value = t.title;
  document.getElementById('modal-creator').textContent = creatorText;
  document.getElementById('modal-created-at').textContent = createdAt;

  document.querySelectorAll('.status-btn').forEach(btn => {
    const active = btn.dataset.status === t.status;
    btn.className = `status-btn flex-1 py-1.5 rounded border text-sm font-medium ${active ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`;
    btn.onclick = () => {
      document.querySelectorAll('.status-btn').forEach(b => {
        b.className = 'status-btn flex-1 py-1.5 rounded border text-sm font-medium border-gray-300 text-gray-600 hover:bg-gray-50';
      });
      btn.className = 'status-btn flex-1 py-1.5 rounded border text-sm font-medium bg-teal-600 text-white border-teal-600';
    };
  });

  const sel = document.getElementById('modal-assignee');
  sel.innerHTML = '<option value="">미할당</option>' +
    members.map(m => `<option value="${m.id}" ${m.id === t.assignee_id ? 'selected' : ''}>${escHtml(m.email)}</option>`).join('');

  document.getElementById('modal-delete').classList.toggle('hidden', !canDelete);
  document.getElementById('task-modal').classList.remove('hidden');
  document.getElementById('task-modal')._taskId = taskId;
}

// D·06: 커스텀 삭제 확인 다이얼로그
function showConfirmDialog(desc) {
  return new Promise((resolve) => {
    document.getElementById('confirm-desc').textContent = desc;
    document.getElementById('confirm-dialog').classList.remove('hidden');
    document.getElementById('confirm-cancel').onclick = () => {
      document.getElementById('confirm-dialog').classList.add('hidden');
      resolve(false);
    };
    document.getElementById('confirm-ok').onclick = () => {
      document.getElementById('confirm-dialog').classList.add('hidden');
      resolve(true);
    };
  });
}

function openStatusMenu(taskId) {
  document.getElementById('status-menu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'status-menu';
  menu.className = 'fixed z-50 bg-white rounded-xl shadow-xl border p-2 space-y-1 min-w-40';
  menu.style.cssText = 'top:50%;left:50%;transform:translate(-50%,-50%)';
  menu.innerHTML = STATUSES.map(s => `<button data-s="${s}" class="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-lg">${LABELS[s]}</button>`).join('');
  document.body.appendChild(menu);
  menu.querySelectorAll('button').forEach(btn => {
    btn.onclick = async () => {
      menu.remove();
      try {
        await api.patch(`/api/tasks/${taskId}/status`, { status: btn.dataset.s });
        await loadData(teamIdRef);
      } catch {}
    };
  });
  setTimeout(() => document.addEventListener('click', () => document.getElementById('status-menu')?.remove(), { once: true }), 0);
}

// ── 이벤트 설정 ──────────────────────────────────────────────────────────────

function setupEvents(teamId) {
  document.getElementById('modal-close').onclick = () => document.getElementById('task-modal').classList.add('hidden');
  document.getElementById('task-modal').onclick = (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); };

  document.getElementById('modal-save').onclick = async () => {
    const modal = document.getElementById('task-modal');
    const id = modal._taskId;
    const title = document.getElementById('modal-title').value.trim();
    const status = document.querySelector('.status-btn.bg-teal-600')?.dataset.status;
    const assigneeVal = document.getElementById('modal-assignee').value;
    const assignee_id = assigneeVal ? parseInt(assigneeVal) : null;
    try {
      if (title) await api.put(`/api/tasks/${id}`, { title, assignee_id });
      if (status) await api.patch(`/api/tasks/${id}/status`, { status });
      modal.classList.add('hidden');
      await loadData(teamId);
    } catch {}
  };

  document.getElementById('modal-delete').onclick = async () => {
    const modal = document.getElementById('task-modal');
    const id = modal._taskId;
    const task = tasks.find(t => t.id === id);
    const confirmed = await showConfirmDialog(`'#${id} ${task?.title || ''}' — 되돌릴 수 없습니다`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      modal.classList.add('hidden');
      await loadData(teamId);
    } catch {}
  };

  document.getElementById('logout-btn').onclick = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    Auth.clear();
    location.hash = '#/login';
  };
  document.getElementById('hamburger').onclick = () => document.getElementById('mobile-menu').classList.remove('hidden');
  document.getElementById('mob-logout').onclick = async () => {
    await api.post('/api/auth/logout').catch(() => {});
    Auth.clear();
    location.hash = '#/login';
  };
  document.getElementById('mob-members').onclick = () => {
    document.getElementById('mobile-menu').classList.add('hidden');
    document.getElementById('member-panel').classList.remove('hidden');
  };
  document.getElementById('members-btn').onclick = () => document.getElementById('member-panel').classList.remove('hidden');

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.className = 'filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
      });
      btn.className = 'filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-white';
      await loadData(teamId);
    });
  });

  document.querySelectorAll('.col-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mobileCol = parseInt(tab.dataset.col);
      document.querySelectorAll('.col-tab').forEach((t, i) => {
        t.className = `col-tab flex-1 py-2 text-sm font-medium border-b-2 ${i === mobileCol ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}`;
      });
      renderMobileCol();
    });
  });

  // FAB 모달
  document.getElementById('fab-btn').onclick = () => {
    document.getElementById('fab-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('fab-input')?.focus(), 100);
  };
  document.getElementById('fab-modal').onclick = (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden'); };
  document.getElementById('fab-cancel').onclick = () => {
    document.getElementById('fab-modal').classList.add('hidden');
    document.getElementById('fab-input').value = '';
  };
  document.getElementById('fab-save').onclick = async () => {
    const title = document.getElementById('fab-input')?.value.trim();
    if (!title) return;
    const user = Auth.user();
    try {
      await api.post(`/api/teams/${teamId}/tasks`, { title, assignee_id: user?.id || null });
      document.getElementById('fab-modal').classList.add('hidden');
      document.getElementById('fab-input').value = '';
      await loadData(teamId);
    } catch {}
  };
  document.getElementById('fab-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('fab-save').click();
    if (e.key === 'Escape') document.getElementById('fab-cancel').click();
  });

  // 드래그 핸들러
  window._dragStart = (e, id) => e.dataTransfer.setData('taskId', String(id));
  window._dragEnter = (el) => {
    el.classList.add('bg-teal-50');
    if (!el.querySelector('.drop-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'drop-placeholder border-2 border-dashed border-teal-300 rounded-lg p-2 text-center text-teal-400 text-xs mt-1';
      ph.textContent = '⬇ 여기에 놓기';
      el.appendChild(ph);
    }
  };
  window._dragLeave = (e, el) => {
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('bg-teal-50');
      el.querySelector('.drop-placeholder')?.remove();
    }
  };
  window._drop = async (e, status, el) => {
    el?.classList.remove('bg-teal-50');
    el?.querySelector('.drop-placeholder')?.remove();
    const id = e.dataTransfer.getData('taskId');
    if (!id) return;
    try {
      await api.patch(`/api/tasks/${id}/status`, { status });
      await loadData(teamId);
    } catch {}
  };
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
