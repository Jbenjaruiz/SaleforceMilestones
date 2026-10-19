import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga un recurso de la API para una clave (p. ej. el id del proyecto). Estados: `idle` (sin clave),
 * `loading`, `refreshing` (recarga silenciosa que conserva los datos a la vista), `ready` y `error`.
 * `fetcher` recibe la clave; solo un cambio de clave dispara una nueva carga, no el de la función.
 */
export function useResource(fetcher, key) {
  const [state, setState] = useState({ status: key ? 'loading' : 'idle', data: null, error: '' });
  const request = useRef(0);
  const latest = useRef(fetcher);
  latest.current = fetcher;

  const load = useCallback(async ({ silent = false } = {}) => {
    const current = ++request.current;
    if (!key) { setState({ status: 'idle', data: null, error: '' }); return; }
    setState((previous) => (silent && previous.data ? { ...previous, status: 'refreshing', error: '' } : { status: 'loading', data: null, error: '' }));
    try {
      const data = await latest.current(key);
      if (current === request.current) setState({ status: 'ready', data, error: '' });
    } catch (error) {
      if (current !== request.current) return;
      setState((previous) => ({ status: 'error', data: silent ? previous.data : null, error: error.message || 'Ocurrió un error inesperado.' }));
    }
  }, [key]);

  useEffect(() => { load(); }, [load]);
  // Una respuesta que llega después de cambiar de clave o desmontar no debe pisar el estado actual.
  useEffect(() => () => { request.current += 1; }, []);

  return { ...state, reload: load, refresh: () => load({ silent: true }) };
}
