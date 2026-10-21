import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, onUnauthorized, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

/** Estados de la sesión: `loading` (comprobando el token guardado), `anonymous` o `authenticated`. */
export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: tokenStore.get() ? 'loading' : 'anonymous', user: null });

  const logout = useCallback(() => {
    tokenStore.clear();
    setState({ status: 'anonymous', user: null });
  }, []);

  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  // Al abrir la página, el token guardado se valida con la API; si ya no sirve, se descarta.
  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let active = true;
    api.get('/auth/me')
      .then((user) => active && setState({ status: 'authenticated', user }))
      .catch(() => { if (active) { tokenStore.clear(); setState({ status: 'anonymous', user: null }); } });
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.login(email, password);
    tokenStore.set(result.accessToken);
    setState({ status: 'authenticated', user: result.user });
  }, []);

  const value = useMemo(() => ({
    ...state,
    login,
    logout,
  }), [state, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}
