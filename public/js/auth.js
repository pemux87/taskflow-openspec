const TOKEN_KEY = 'tf_token';
const USER_KEY = 'tf_user';

export const Auth = {
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() {
    return !!this.token();
  },
};
