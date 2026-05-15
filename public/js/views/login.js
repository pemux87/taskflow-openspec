import { api } from '../api.js';
import { Auth } from '../auth.js';

export function renderLogin(app) {
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-block bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-2">TaskFlow</div>
          <h1 class="text-2xl font-bold text-gray-800">로그인</h1>
        </div>
        <div id="error-msg" class="hidden bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
          <span>✕</span><span id="error-text"></span>
        </div>
        <form id="login-form" class="space-y-4">
          <input type="email" id="email" placeholder="이메일"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
          <input type="password" id="password" placeholder="비밀번호"
            class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
          <button type="submit" id="submit-btn"
            class="w-full bg-teal-600 text-white rounded-lg py-3 font-semibold hover:bg-teal-700 transition disabled:opacity-60">
            로그인
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-4">
          계정이 없으신가요? <a href="#/signup" class="text-teal-600 hover:underline">회원가입</a>
        </p>
      </div>
    </div>`;

  const form = document.getElementById('login-form');
  const errorMsg = document.getElementById('error-msg');
  const errorText = document.getElementById('error-text');
  const btn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');
    btn.textContent = '로그인 중…';
    btn.disabled = true;

    try {
      const res = await api.post('/api/auth/login', {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      });
      Auth.save(res.token, res.user);
      btn.textContent = '✓ 성공! 이동 중…';
      btn.className = 'w-full bg-green-600 text-white rounded-lg py-3 font-semibold transition disabled:opacity-60';
      setTimeout(() => { location.hash = res.user.team_id ? '#/kanban' : '#/team'; }, 400);
    } catch (err) {
      errorText.textContent = err?.error?.message || '로그인 중 오류가 발생했습니다';
      errorMsg.classList.remove('hidden');
      btn.textContent = '로그인';
      btn.disabled = false;
    }
  });
}
