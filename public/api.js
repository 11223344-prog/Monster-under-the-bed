/* api.js — shared frontend API client */
const API = (() => {
  const BASE = '/api/game';
  function token()   { return localStorage.getItem('mutb_token') || ''; }
  function headers() { return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` }; }
  async function req(method, path, body) {
    try {
      const r = await fetch(BASE + path, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined });
      return await r.json();
    } catch { return { error: 'Network error' }; }
  }
  function cache(data) {
    if (data.token) localStorage.setItem('mutb_token',    data.token);
    if (data.user)  localStorage.setItem('mutb_user',     JSON.stringify(data.user));
    if (data.user?.username) localStorage.setItem('mutb_username', data.user.username);
  }
  return {
    isLoggedIn() { return !!token(); },
    username()   { return localStorage.getItem('mutb_username') || 'Player'; },
    getUser()    { try { return JSON.parse(localStorage.getItem('mutb_user') || 'null'); } catch { return null; } },
    logout()     { ['mutb_token','mutb_username','mutb_user'].forEach(k => localStorage.removeItem(k)); },

    async register(username, password) { const d = await req('POST', '/register', { username, password }); if (!d.error) cache(d); return d; },
    async login(username, password)    { const d = await req('POST', '/login',    { username, password }); if (!d.error) cache(d); return d; },

    async save(state)      { return req('POST',   '/save',        state); },
    async load()           { return req('GET',    '/load'); },
    async deleteSave()     { return req('DELETE', '/delete'); },
    async restart()        { return req('POST',   '/restart'); },

    // Gamification endpoints
    async caught(data)     { const d = await req('POST', '/caught',   data); if (d.user) cache({ user: d.user }); return d; },
    async escaped(data)    { const d = await req('POST', '/escaped',  data); if (d.user) cache({ user: d.user }); return d; },
    async profile()        { return req('GET', '/profile'); },
    async leaderboard()    { return req('GET', '/leaderboard'); },

    async getSettings()    { return req('GET',  '/settings'); },
    async putSettings(s)   { return req('PUT',  '/settings', s); },
  };
})();
