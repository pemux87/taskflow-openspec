import { api } from '../api.js';
import { Auth } from '../auth.js';

export function renderSignup(app) {
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-block bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xl mb-2">TaskFlow</div>
          <h1 class="text-2xl font-bold text-gray-800">회원가입</h1>
        </div>
        <div id="error-msg" class="hidden bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm"></div>
        <form id="signup-form" class="space-y-4">
          <div>
            <input type="email" id="email" placeholder="이메일 입력"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
            <p id="email-err" class="hidden text-red-500 text-xs mt-1">올바른 이메일 형식이 아닙니다</p>
          </div>
          <div>
            <input type="password" id="password" placeholder="비밀번호 (8자 이상)"
              class="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" required />
            <p id="pw-err" class="hidden text-red-500 text-xs mt-1">8자 이상 입력해주세요</p>
          </div>
          <button type="submit" id="submit-btn"
            class="w-full bg-teal-600 text-white rounded-lg py-3 font-semibold hover:bg-teal-700 transition disabled:opacity-60">
            가입하기
          </button>
        </form>
        <p class="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요? <a href="#/login" class="text-teal-600 hover:underline">로그인</a>
        </p>
      </div>
    </div>`;

  const form = document.getElementById('signup-form');
  const emailInput = document.getElementById('email');
  const pwInput = document.getElementById('password');
  const emailErr = document.getElementById('email-err');
  const pwErr = document.getElementById('pw-err');
  const errorMsg = document.getElementById('error-msg');
  const btn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailErr.classList.add('hidden');
    pwErr.classList.add('hidden');
    errorMsg.classList.add('hidden');

    let valid = true;
    if (!emailInput.value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      emailErr.classList.remove('hidden');
      valid = false;
    }
    if (pwInput.value.length < 8) {
      pwErr.classList.remove('hidden');
      valid = false;
    }
    if (!valid) return;

    btn.textContent = '처리 중…';
    btn.disabled = true;

    try {
      const res = await api.post('/api/auth/signup', {
        email: emailInput.value,
        password: pwInput.value,
      });
      Auth.save(res.token, res.user);
      location.hash = '#/team';
    } catch (err) {
      const code = err?.error?.code;
      if (code === 'EMAIL_TAKEN') {
        errorMsg.textContent = '이미 가입된 이메일입니다';
      } else {
        errorMsg.textContent = '가입 중 오류가 발생했습니다';
      }
      errorMsg.classList.remove('hidden');
      btn.textContent = '가입하기';
      btn.disabled = false;
    }
  });
}
