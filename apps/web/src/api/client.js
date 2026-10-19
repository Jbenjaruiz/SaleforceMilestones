import { messageFor } from './messages.js';

// En desarrollo Vite redirige /api a la API local; en producción se puede apuntar a otra URL con VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const TOKEN_KEY = 'seguimiento.token';

/** El almacenamiento del navegador puede fallar (modo privado, datos bloqueados): nunca debe romper la página. */
export const tokenStore = {
  get() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(token) { try { localStorage.setItem(TOKEN_KEY, token); } catch { /* sin almacenamiento: la sesión dura lo que la página */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* nada que limpiar */ } },
};

export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let unauthorizedHandler = null;
/** La capa de autenticación se registra aquí para cerrar la sesión cuando la API responde 401. */
export const onUnauthorized = (handler) => { unauthorizedHandler = handler; };

async function send(path, { method = 'GET', body, form, auth = true } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) payload = form; // el navegador fija el multipart y su separador
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }

  let response;
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(0, messageFor(0));
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    if (response.status === 401 && auth && token) unauthorizedHandler?.();
    throw new ApiError(response.status, messageFor(response.status, data), data);
  }
  return response;
}

async function json(path, options) {
  const response = await send(path, options);
  return response.status === 204 ? null : response.json();
}

export const api = {
  get: (path) => json(path),
  post: (path, body) => json(path, { method: 'POST', body }),
  patch: (path, body) => json(path, { method: 'PATCH', body }),
  put: (path, body) => json(path, { method: 'PUT', body }),
  delete: (path) => json(path, { method: 'DELETE' }),
  upload: (path, form) => json(path, { method: 'POST', form }),
  login: (email, password) => json('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  /** Descarga con sesión: un <img> o un enlace no pueden enviar el token, así que se pide como archivo. */
  blob: async (path) => (await send(path)).blob(),
};
