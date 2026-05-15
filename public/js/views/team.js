import { api } from '../api.js';
import { Auth } from '../auth.js';

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderTeam(app) {
  const user = Auth.user();
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <header class="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div class="bg-teal-600 text-white px-3 py-1 rounded font-bold">TaskFlow</div>
        <div class="flex items-center gap-4 text-sm text-gray-600">
          <span>${escHtml(user?.email || '')}</span>
          <button id="logout-btn" class="text-gray-400 hover:text-gray-600">로그아웃</button>
        </div>
      </header>
      <div class="max-w-2xl mx-auto mt-12 px-4">
        <div class="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-8 text-teal-700 text-sm">
          ⓘ 아직 팀에 소속되지 않았습니다. 팀을 만들거나 초대코드로 합류하세요.
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          <!-- 팀 만들기 -->
          <div id="create-panel" class="bg-white rounded-xl shadow-sm border p-6">
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
          <div id="join-panel" class="bg-white rounded-xl shadow-sm border p-6">
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
    await api.post('/api/auth/logout').catch(() => {});
    Auth.clear();
    location.hash = '#/login';
  });

  document.getElementById('create-btn').addEventListener('click', async () => {
    const name = document.getElementById('team-name').value.trim();
    const errEl = document.getElementById('create-error');
    errEl.classList.add('hidden');
    if (!name) { errEl.textContent = '팀 이름을 입력해주세요'; errEl.classList.remove('hidden'); return; }
    const btn = document.getElementById('create-btn');
    btn.disabled = true; btn.textContent = '생성 중…';
    try {
      const res = await api.post('/api/teams', { name });
      Auth.save(Auth.token(), { ...Auth.user(), team_id: res.id });
      // C·02: 초대코드 발급 화면
      document.getElementById('create-panel').innerHTML = `
        <div class="text-center">
          <div class="text-teal-600 font-bold text-lg mb-4">✓ 팀이 생성되었습니다!</div>
          <p class="text-gray-700 font-semibold mb-1">${escHtml(res.name)}</p>
          <p class="text-sm text-gray-500 mb-3">초대코드 (멤버에게 공유)</p>
          <div class="flex items-center justify-center gap-3 bg-gray-50 border rounded-lg px-4 py-3 mb-6">
            <span class="font-mono font-bold text-xl tracking-widest text-gray-800">${escHtml(res.invite_code)}</span>
            <button id="copy-code" class="text-teal-600 hover:text-teal-700 text-lg" title="복사">📋</button>
          </div>
          <button id="start-kanban" class="w-full bg-teal-600 text-white rounded-lg py-2.5 font-semibold hover:bg-teal-700 transition">
            칸반 시작하기 →
          </button>
        </div>`;
      document.getElementById('copy-code').onclick = () => {
        navigator.clipboard.writeText(res.invite_code).catch(() => {}).then(() => {
          const copyBtn = document.getElementById('copy-code');
          if (copyBtn) {
            copyBtn.textContent = '✓';
            setTimeout(() => { if (document.getElementById('copy-code')) document.getElementById('copy-code').textContent = '📋'; }, 1500);
          }
        });
      };
      document.getElementById('start-kanban').onclick = () => { location.hash = '#/kanban'; };
    } catch (err) {
      errEl.textContent = err?.error?.message || '팀 생성 중 오류가 발생했습니다';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '만들기';
    }
  });

  const codeInput = document.getElementById('invite-code');
  codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase(); });

  document.getElementById('join-btn').addEventListener('click', async () => {
    const code = document.getElementById('invite-code').value.trim();
    const errEl = document.getElementById('join-error');
    errEl.classList.add('hidden');
    if (!/^[A-Z]{4}-[0-9]{4}$/.test(code)) {
      errEl.textContent = '⚠ 형식이 올바르지 않습니다 (예: FRNT-2026)';
      errEl.classList.remove('hidden');
      return;
    }
    const btn = document.getElementById('join-btn');
    btn.disabled = true; btn.textContent = '확인 중…';
    try {
      const res = await api.post('/api/teams/join', { invite_code: code });
      Auth.save(Auth.token(), { ...Auth.user(), team_id: res.team.id });
      // C·03: 팀 합류 미리보기 화면
      document.getElementById('join-panel').innerHTML = `
        <div>
          <div class="text-teal-600 font-bold mb-3">✓ ${escHtml(res.team.name)} 팀이 확인되었습니다</div>
          <div class="bg-gray-50 border rounded-lg p-4 mb-4">
            <p class="font-semibold text-gray-800">${escHtml(res.team.name)}</p>
            <p class="text-sm text-gray-500 mt-1">멤버 ${res.team.member_count}명</p>
          </div>
          <button id="confirm-join" class="w-full bg-orange-500 text-white rounded-lg py-2.5 font-semibold hover:bg-orange-600 transition">
            이 팀에 합류 →
          </button>
        </div>`;
      document.getElementById('confirm-join').onclick = () => { location.hash = '#/kanban'; };
    } catch (err) {
      const code = err?.error?.code;
      if (code === 'NOT_FOUND') errEl.textContent = '⚠ 해당 초대코드를 찾을 수 없습니다';
      else if (code === 'ALREADY_IN_TEAM' || code === 'CONFLICT') errEl.textContent = '⚠ 이미 다른 팀에 소속되어 있습니다';
      else errEl.textContent = err?.error?.message || '합류 중 오류가 발생했습니다';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '합류';
    }
  });
}
