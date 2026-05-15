import { api } from '../api.js';
import { Auth } from '../auth.js';

let pollTimer = null;
let lastSince = null;

export async function renderChat(app) {
  const user = Auth.user();
  const teamId = user?.team_id;

  app.innerHTML = `
    <div class="min-h-screen bg-gray-100 flex flex-col">
      <!-- 헤더 -->
      <header class="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-3">
          <div class="bg-teal-600 text-white px-3 py-1 rounded font-bold text-sm">TaskFlow</div>
          <span id="team-name" class="text-gray-700 text-sm font-medium hidden md:block"></span>
        </div>
        <nav class="hidden md:flex gap-1">
          <a href="#/kanban" class="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded text-sm">칸반</a>
          <a href="#/chat" class="px-3 py-1.5 bg-teal-600 text-white rounded text-sm font-medium">채팅</a>
        </nav>
        <div class="flex items-center gap-2">
          <span id="poll-status" class="text-xs text-teal-500 hidden md:block">● 5초마다 새로고침</span>
          <button id="hamburger" class="md:hidden p-2 text-gray-600">☰</button>
        </div>
      </header>

      <!-- 모바일 메뉴 -->
      <div id="mobile-menu" class="hidden fixed inset-0 z-50 bg-black bg-opacity-40" onclick="this.classList.add('hidden')">
        <div class="absolute right-0 top-0 h-full w-64 bg-white shadow-xl p-4" onclick="event.stopPropagation()">
          <p class="text-sm font-medium text-gray-800 mb-4 px-2">${user?.email || ''}</p>
          <nav class="space-y-1">
            <a href="#/kanban" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700">📋 칸반</a>
            <a href="#/chat" onclick="document.getElementById('mobile-menu').classList.add('hidden')" class="flex items-center gap-3 px-3 py-2.5 bg-gray-100 rounded-lg text-sm font-medium">💬 채팅</a>
            <button id="mob-logout" class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg text-sm text-gray-700">🚪 로그아웃</button>
          </nav>
        </div>
      </div>

      <!-- 메시지 영역 -->
      <div id="msg-area" class="flex-1 overflow-y-auto p-4 space-y-3"></div>

      <!-- 입력창 -->
      <div class="bg-white border-t px-4 py-3 flex-shrink-0">
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <textarea id="msg-input" rows="1"
              placeholder="메시지 입력 (1000자 이내)…"
              class="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              style="max-height:120px"></textarea>
            <div class="flex justify-between mt-1">
              <span id="char-count" class="text-xs text-gray-400">0 / 1000</span>
              <span id="offline-msg" class="hidden text-xs text-red-500">오프라인 — 연결 복구 후 전송됩니다</span>
            </div>
          </div>
          <button id="send-btn"
            class="bg-teal-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50 flex-shrink-0">
            전송
          </button>
        </div>
      </div>
    </div>`;

  // 팀 이름 로드
  try {
    const team = await api.get(`/api/teams/${teamId}`);
    const el = document.getElementById('team-name');
    if (el) el.textContent = team.name + ' 팀 · 채팅';
  } catch {}

  await loadMessages(teamId, true);
  startPolling(teamId);
  setupChatEvents(teamId);
  mobileViewport();
}

async function loadMessages(teamId, initial = false) {
  const area = document.getElementById('msg-area');
  if (!area) return;
  const user = Auth.user();
  try {
    const url = `/api/teams/${teamId}/messages${!initial && lastSince ? `?since=${lastSince}` : ''}`;
    const msgs = await api.get(url);
    if (msgs.length === 0 && initial) {
      area.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center py-16">
          <div class="text-5xl mb-4">💬</div>
          <p class="text-gray-500 font-medium">아직 대화가 없습니다</p>
          <p class="text-gray-400 text-sm mt-1">첫 메시지를 보내 팀원과 대화를 시작하세요</p>
        </div>`;
      return;
    }
    if (initial && msgs.length > 0) area.innerHTML = '';

    msgs.forEach(m => {
      const isMe = m.user_id === user?.id;
      const div = document.createElement('div');
      div.className = `flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`;
      div.dataset.msgId = m.id;
      div.innerHTML = `
        ${!isMe ? `<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold flex-shrink-0">${(m.user_email || '?')[0].toUpperCase()}</div>` : ''}
        <div class="max-w-xs md:max-w-sm">
          ${!isMe ? `<p class="text-xs text-gray-400 mb-1">${escHtml(m.user_email || '')} · ${fmtTime(m.created_at)}</p>` : ''}
          <div class="relative group">
            <div class="px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-teal-600 text-white rounded-br-sm' : 'bg-white border text-gray-800 rounded-bl-sm'}">
              ${escHtml(m.content)}
            </div>
            ${isMe ? `<button onclick="window._deleteMsg(${m.id})" class="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm transition">🗑</button>` : ''}
          </div>
          ${isMe ? `<p class="text-xs text-gray-400 mt-1 text-right">${fmtTime(m.created_at)}</p>` : ''}
        </div>`;
      area.appendChild(div);
    });

    if (msgs.length > 0) {
      lastSince = msgs[msgs.length - 1].created_at;
      area.scrollTop = area.scrollHeight;
    }
    setOnline(true);
  } catch {
    setOnline(false);
  }
}

function startPolling(teamId) {
  if (pollTimer) clearInterval(pollTimer);
  const input = document.getElementById('msg-input');
  let interval = 5000;

  input?.addEventListener('focus', () => { clearInterval(pollTimer); pollTimer = setInterval(() => loadMessages(teamId), 2000); });
  input?.addEventListener('blur', () => { clearInterval(pollTimer); pollTimer = setInterval(() => loadMessages(teamId), 5000); });

  pollTimer = setInterval(() => loadMessages(teamId), interval);

  window.addEventListener('hashchange', () => { clearInterval(pollTimer); }, { once: true });
}

function setupChatEvents(teamId) {
  const input = document.getElementById('msg-input');
  const sendBtn = document.getElementById('send-btn');
  const counter = document.getElementById('char-count');

  input?.addEventListener('input', () => {
    const len = input.value.length;
    counter.textContent = `${len} / 1000`;
    counter.className = `text-xs ${len > 1000 ? 'text-red-500 font-semibold' : 'text-gray-400'}`;
    sendBtn.disabled = len > 1000 || len === 0;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  });

  sendBtn?.addEventListener('click', async () => {
    const content = input?.value.trim();
    if (!content || content.length > 1000) return;
    sendBtn.disabled = true;
    try {
      await api.post(`/api/teams/${teamId}/messages`, { content });
      input.value = '';
      counter.textContent = '0 / 1000';
      input.style.height = 'auto';
      await loadMessages(teamId);
    } catch {} finally {
      sendBtn.disabled = false;
    }
  });

  document.getElementById('hamburger')?.addEventListener('click', () => document.getElementById('mobile-menu').classList.remove('hidden'));
  document.getElementById('mob-logout')?.addEventListener('click', async () => {
    await api.post('/api/auth/logout');
    Auth.clear();
    location.hash = '#/login';
  });

  window._deleteMsg = async (id) => {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    try { await api.delete(`/api/messages/${id}`); el?.remove(); } catch {}
  };
}

function mobileViewport() {
  if (!window.visualViewport) return;
  window.visualViewport.addEventListener('resize', () => {
    const area = document.getElementById('msg-area');
    if (!area) return;
    const offset = window.innerHeight - window.visualViewport.height;
    area.style.marginBottom = offset > 100 ? offset + 'px' : '0';
    area.scrollTop = area.scrollHeight;
  });
}

function setOnline(online) {
  const el = document.getElementById('poll-status');
  if (!el) return;
  el.textContent = online ? '● 5초마다 새로고침' : '⚠ 연결 끊김 · 재시도 중';
  el.className = `text-xs hidden md:block ${online ? 'text-teal-500' : 'text-red-500'}`;
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
