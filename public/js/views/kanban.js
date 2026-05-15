import { api } from '../api.js';
import { Auth } from '../auth.js';

const STATUSES = ['TODO', 'DOING', 'DONE'];
const LABELS = { TODO: 'TODO', DOING: 'DOING', DONE: 'DONE' };
const COLORS = { TODO: 'bg-yellow-100 text-yellow-800', DOING: 'bg-blue-100 text-blue-800', DONE: 'bg-green-100 text-green-800' };

let tasks = [], members = [], currentFilter = 'all', mobileCol = 0;

export async function renderKanban(app) {
  const user = Auth.user();
  const teamId = user?.team_id;

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
          <span class="text-sm text-gray-500 hidden md:block">${user?.email || ''}</span>
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
            <div><p class="text-sm font-medium text-gray-800">${user?.email || ''}</p></div>
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
      </div>

      <!-- 모바일 컬럼 탭 -->
      <div class="md:hidden flex border-b bg-white">
        ${STATUSES.map((s, i) => `
          <button data-col="${i}" class="col-tab flex-1 py-2 text-sm font-medium border-b-2 ${i === 0 ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500'}">
            ${LABELS[s]}
          </button>`).join('')}
      </div>

      <!-- 칸반 보드 -->
      <div class="flex-1 p-4">
        <div class="hidden md:grid md:grid-cols-3 gap-4 h-full" id="kanban-desktop"></div>
        <div class="md:hidden" id="kanban-mobile"></div>
      </div>

      <!-- 모바일 FAB -->
      <button id="fab-btn" class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-teal-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-teal-700 z-40">+</button>

      <!-- 멤버 패널 -->
      <div id="member-panel" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40" onclick="this.classList.add('hidden')">
        <div class="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-6" onclick="event.stopPropagation()">
          <h2 class="font-bold text-gray-800 mb-4" id="member-count">팀 멤버</h2>
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
          <div class="flex gap-2 mt-6">
            <button id="modal-save" class="flex-1 bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700">저장</button>
            <button id="modal-delete" class="px-4 bg-red-50 text-red-600 rounded-lg py-2 text-sm font-semibold hover:bg-red-100 hidden">🗑 삭제</button>
          </div>
        </div>
      </div>
    </div>`;

  await loadData(teamId);
  setupEvents(teamId);
}

async function loadData(teamId) {
  try {
    const [t, m, team] = await Promise.all([
      api.get(`/api/teams/${teamId}/tasks${currentFilter !== 'all' ? `?filter=${currentFilter}` : ''}`),
      api.get(`/api/teams/${teamId}/members`),
      api.get(`/api/teams/${teamId}`),
    ]);
    tasks = t;
    members = m;
    document.getElementById('team-name').textContent = team.name + ' 팀';
    renderBoard();
    renderMemberList(team.owner_id);
  } catch {}
}

function renderBoard() {
  renderDesktop();
  renderMobileCol();
}

function renderDesktop() {
  const el = document.getElementById('kanban-desktop');
  if (!el) return;
  el.innerHTML = STATUSES.map(s => `
    <div class="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 font-bold text-sm flex items-center justify-between ${s === 'TODO' ? 'bg-yellow-50 text-yellow-800' : s === 'DOING' ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'}">
        <span>${LABELS[s]} · ${tasks.filter(t => t.status === s).length}</span>
        <button data-add="${s}" class="add-col-btn text-xl font-light hover:opacity-70 leading-none">+</button>
      </div>
      <div class="flex-1 p-3 space-y-2 min-h-32 drop-zone" data-col="${s}" ondragover="event.preventDefault()" ondrop="window._drop(event,'${s}')">
        ${tasks.filter(t => t.status === s).map(t => taskCard(t)).join('')}
        <div id="inline-${s}" class="hidden">
          <input type="text" class="inline-input w-full border border-teal-400 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="태스크 제목..." />
        </div>
      </div>
    </div>`).join('');
  addCardListeners();
}

function renderMobileCol() {
  const el = document.getElementById('kanban-mobile');
  if (!el) return;
  const s = STATUSES[mobileCol];
  const col_tasks = tasks.filter(t => t.status === s);
  el.innerHTML = `
    <div class="bg-white rounded-xl shadow-sm overflow-hidden">
      <div class="px-4 py-3 font-bold text-sm flex items-center justify-between ${s === 'TODO' ? 'bg-yellow-50 text-yellow-800' : s === 'DOING' ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'}">
        ${LABELS[s]} · ${col_tasks.length}
      </div>
      <div class="p-3 space-y-2">
        ${col_tasks.map(t => taskCard(t, true)).join('')}
        ${col_tasks.length === 0 ? '<p class="text-center text-gray-400 text-sm py-8">카드 없음</p>' : ''}
      </div>
    </div>`;
  addCardListeners();
}

function taskCard(t, mobile = false) {
  const user = Auth.user();
  const assignee = members.find(m => m.id === t.assignee_id);
  return `
    <div class="task-card bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-teal-400 hover:shadow-sm transition"
      data-id="${t.id}" draggable="${!mobile}" ondragstart="window._dragStart(event,'${t.id}')">
      <p class="text-sm font-medium text-gray-800 mb-1">${escHtml(t.title)}</p>
      <div class="flex items-center gap-2 text-xs text-gray-400">
        <span>#${t.id}</span>
        ${t.assignee_id ? `<span class="text-teal-600">@${assignee?.email?.split('@')[0] || '?'}</span>` : '<span class="text-orange-400">⚠미할당</span>'}
      </div>
    </div>`;
}

function renderMemberList(ownerId) {
  const el = document.getElementById('member-list');
  const cnt = document.getElementById('member-count');
  if (!el || !cnt) return;
  cnt.textContent = `팀 멤버 (${members.length})`;
  el.innerHTML = members.map(m => `
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
        ${m.email[0].toUpperCase()}
      </div>
      <div>
        <p class="text-sm font-medium text-gray-800">${escHtml(m.email)}</p>
        <p class="text-xs ${m.id === ownerId ? 'text-yellow-600 font-semibold' : 'text-gray-400'}">
          ${m.id === ownerId ? '★ owner' : 'member'}
        </p>
      </div>
    </div>`).join('');
}

function addCardListeners() {
  document.querySelectorAll('.task-card').forEach(el => {
    el.addEventListener('click', () => openModal(parseInt(el.dataset.id)));
    let lt;
    el.addEventListener('touchstart', () => { lt = setTimeout(() => openStatusMenu(parseInt(el.dataset.id), el), 600); });
    el.addEventListener('touchend', () => clearTimeout(lt));
  });
  document.querySelectorAll('.add-col-btn').forEach(btn => {
    btn.addEventListener('click', () => showInline(btn.dataset.add));
  });
  document.querySelectorAll('.inline-input').forEach(inp => {
    inp.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') await saveInline(inp);
      if (e.key === 'Escape') hideInline(inp.closest('[id^=inline-]'));
    });
  });
}

function showInline(status) {
  const el = document.getElementById(`inline-${status}`);
  if (!el) return;
  el.classList.remove('hidden');
  el.querySelector('input').focus();
}

function hideInline(el) {
  el?.classList.add('hidden');
  if (el?.querySelector('input')) el.querySelector('input').value = '';
}

async function saveInline(inp) {
  const title = inp.value.trim();
  const status = inp.closest('[id^=inline-]')?.id.replace('inline-', '');
  if (!title || !status) return;
  const user = Auth.user();
  try {
    await api.post(`/api/teams/${user.team_id}/tasks`, { title, assignee_id: user.id });
    await loadData(user.team_id);
  } catch {}
}

function openModal(taskId) {
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  const modal = document.getElementById('task-modal');
  const user = Auth.user();
  const owner = members.find(m => m.role === 'owner');
  const canDelete = t.creator_id === user.id || owner?.id === user.id;

  document.getElementById('modal-id').textContent = `#${t.id}`;
  document.getElementById('modal-title').value = t.title;

  document.querySelectorAll('.status-btn').forEach(btn => {
    const active = btn.dataset.status === t.status;
    btn.className = `status-btn flex-1 py-1.5 rounded border text-sm font-medium ${active ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`;
    btn.onclick = () => {
      document.querySelectorAll('.status-btn').forEach(b => b.className = 'status-btn flex-1 py-1.5 rounded border text-sm font-medium border-gray-300 text-gray-600 hover:bg-gray-50');
      btn.className = 'status-btn flex-1 py-1.5 rounded border text-sm font-medium bg-teal-600 text-white border-teal-600';
    };
  });

  const sel = document.getElementById('modal-assignee');
  sel.innerHTML = '<option value="">미할당</option>' + members.map(m => `<option value="${m.id}" ${m.id === t.assignee_id ? 'selected' : ''}>${m.email}</option>`).join('');

  document.getElementById('modal-delete').classList.toggle('hidden', !canDelete);
  modal.classList.remove('hidden');
  modal._taskId = taskId;
}

function setupEvents(teamId) {
  const user = Auth.user();

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
    if (!confirm('이 카드를 삭제하시겠습니까?')) return;
    const id = document.getElementById('task-modal')._taskId;
    try {
      await api.delete(`/api/tasks/${id}`);
      document.getElementById('task-modal').classList.add('hidden');
      await loadData(teamId);
    } catch {}
  };

  document.getElementById('logout-btn').onclick = async () => {
    await api.post('/api/auth/logout');
    Auth.clear();
    location.hash = '#/login';
  };

  document.getElementById('hamburger').onclick = () => document.getElementById('mobile-menu').classList.remove('hidden');
  document.getElementById('mob-logout').onclick = async () => { await api.post('/api/auth/logout'); Auth.clear(); location.hash = '#/login'; };
  document.getElementById('mob-members').onclick = () => { document.getElementById('mobile-menu').classList.add('hidden'); document.getElementById('member-panel').classList.remove('hidden'); };
  document.getElementById('members-btn').onclick = () => document.getElementById('member-panel').classList.remove('hidden');

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => { b.className = 'filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200'; });
      btn.className = 'filter-btn px-3 py-1 rounded-full text-sm font-medium bg-gray-800 text-white';
      await loadData(teamId);
    });
  });

  document.querySelectorAll('.col-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      mobileCol = parseInt(tab.dataset.col);
      document.querySelectorAll('.col-tab').forEach(t => { t.className = 'col-tab flex-1 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500'; });
      tab.className = 'col-tab flex-1 py-2 text-sm font-medium border-b-2 border-teal-600 text-teal-600';
      renderMobileCol();
    });
  });

  document.getElementById('fab-btn').onclick = () => {
    const title = prompt('태스크 제목을 입력하세요:');
    if (title?.trim()) {
      api.post(`/api/teams/${teamId}/tasks`, { title: title.trim() }).then(() => loadData(teamId));
    }
  };

  window._dragStart = (e, id) => e.dataTransfer.setData('taskId', id);
  window._drop = async (e, status) => {
    const id = e.dataTransfer.getData('taskId');
    if (!id) return;
    try { await api.patch(`/api/tasks/${id}/status`, { status }); await loadData(teamId); } catch {}
  };
}

function openStatusMenu(taskId, el) {
  const existing = document.getElementById('status-menu');
  if (existing) existing.remove();
  const menu = document.createElement('div');
  menu.id = 'status-menu';
  menu.className = 'fixed z-50 bg-white rounded-xl shadow-xl border p-2 space-y-1';
  menu.style.cssText = `top:50%;left:50%;transform:translate(-50%,-50%)`;
  menu.innerHTML = STATUSES.map(s => `<button data-s="${s}" class="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 rounded-lg">${LABELS[s]}</button>`).join('');
  document.body.appendChild(menu);
  menu.querySelectorAll('button').forEach(btn => {
    btn.onclick = async () => {
      menu.remove();
      const user = Auth.user();
      try { await api.patch(`/api/tasks/${taskId}/status`, { status: btn.dataset.s }); await loadData(user.team_id); } catch {}
    };
  });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
