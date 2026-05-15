import { Auth } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderSignup } from './views/signup.js';
import { renderTeam } from './views/team.js';
import { renderKanban } from './views/kanban.js';
import { renderChat } from './views/chat.js';

const app = document.getElementById('app');

const routes = {
  '#/login': renderLogin,
  '#/signup': renderSignup,
  '#/team': renderTeam,
  '#/kanban': renderKanban,
  '#/chat': renderChat,
};

export function navigate(hash) {
  location.hash = hash;
}

function handleRoute() {
  const hash = location.hash || '#/login';
  const render = routes[hash];

  if (!Auth.isLoggedIn() && hash !== '#/login' && hash !== '#/signup') {
    location.hash = '#/login';
    return;
  }

  if (Auth.isLoggedIn()) {
    const user = Auth.user();
    if (hash === '#/login' || hash === '#/signup') {
      location.hash = user?.team_id ? '#/kanban' : '#/team';
      return;
    }
    if ((hash === '#/kanban' || hash === '#/chat') && !user?.team_id) {
      location.hash = '#/team';
      return;
    }
  }

  if (render) {
    render(app);
  } else {
    location.hash = '#/login';
  }
}

window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);
