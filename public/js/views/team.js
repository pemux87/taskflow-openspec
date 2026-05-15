import { api } from '../api.js';
import { Auth } from '../auth.js';

export function renderTeam(app) {
  const user = Auth.user();
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div class="bg-teal-600 text-white px-3 py-1 rounded font-bold">TaskFlow</div>
        <div class="flex items-center gap-4 text-sm text-gray-600">
          <span>${user?.email || ''}</span>
          <button id="logout-btn" class="text-gray-400 hover:text-gray-600">로그아웃</button>
        </div>
      </header>
      <div class="max-w-2xl mx-auto mt-12 px-4">
        <div class="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8 text-teal-700 text-sm">
          ⓘ 아직 팀에 소속되지 않았습니다. 팀을 만들거나 초대코드로 합류하세요.
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- 팀 만들기 -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h2 class="font-bold text-gray-800 mb-4">+ 새 팀 만들기</h2>
            <div id="create-error" class="hidden text-red-500 text-xs mb-2"></div>
            <input type="text" id="team-name" placeholder="팀 이름 (1–30자)"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500" maxlength="30" />
            <button id="create-btn"
              class="w-full bg-teal-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-60">
              만들기
            </button>
          </div>
          <!-- 초대코드 합류 -->
          <div class="bg-white rounded-xl shadow-sm border p-6">
            <h2 class="font-bold text-gray-800 mb-4">초대코드로 합류</h2>
            <div id="join-error" class="hidden text-red-500 text-xs mb-2"></div>
            <input type="text" id="invite-code" placeholder="ABCD-1234"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-1 font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
              maxlength="9" />
            <p class="text-gray-400 text-xs mb-3 text-center">형식: 대문자 4 + 숫자 4 (하이픈 포함)</p>
            <button id="join-btn"
              class="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60">
              합류
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await api.post('/api/auth/logout');
    Auth.clear();
    location.hash = '#/login';
  });

  document.getElementById('create-btn').addEventListener('click', async () => {
    const name = document.getElementById('team-name').value.trim();
    const errEl = document.getElementById('create-error');
    errEl.classList.add('hidden');
    if (!name) { errEl.textContent = '팀 이름을 입력해주세요'; errEl.classList.remove('hidden'); return; }
    try {
      const btn = document.getElementById('create-btn');
      btn.disabled = true; btn.textContent = '생성 중…';
      const res = await api.post('/api/teams', { name });
      const user = Auth.user();
      Auth.save(Auth.token(), { ...user, team_id: res.id });
      location.hash = '#/kanban';
    } catch (err) {
      const errEl = document.getElementById('create-error');
      errEl.textContent = err?.error?.message || '팀 생성 중 오류가 발생했습니다';
      errEl.classList.remove('hidden');
      document.getElementById('create-btn').disabled = false;
      document.getElementById('create-btn').textContent = '만들기';
    }
  });

  const codeInput = document.getElementById('invite-code');
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.toUpperCase();
  });

  document.getElementById('join-btn').addEventListener('click', async () => {
    const code = document.getElementById('invite-code').value.trim();
    const errEl = document.getElementById('join-error');
    errEl.classList.add('hidden');
    if (!/^[A-Z]{4}-[0-9]{4}$/.test(code)) {
      errEl.textContent = '형식이 올바르지 않습니다 (예: FRNT-2026)';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      const btn = document.getElementById('join-btn');
      btn.disabled = true; btn.textContent = '합류 중…';
      const res = await api.post('/api/teams/join', { invite_code: code });
      const user = Auth.user();
      Auth.save(Auth.token(), { ...user, team_id: res.team.id });
      location.hash = '#/kanban';
    } catch (err) {
      errEl.textContent = err?.error?.message || '합류 중 오류가 발생했습니다';
      errEl.classList.remove('hidden');
      document.getElementById('join-btn').disabled = false;
      document.getElementById('join-btn').textContent = '합류';
    }
  });
}
