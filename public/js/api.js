import { Auth } from './auth.js';

const BASE = '';

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.token();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    Auth.clear();
    location.hash = '#/login';
    throw new Error('TOKEN_EXPIRED');
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
