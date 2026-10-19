import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWorkbook, WorkbookError } from '../services/workbook.js';
import { buildDashboard } from '../utils/dashboard.js';
import { todayCalendarDay } from '../utils/dates.js';

/** Carga el Excel y calcula el tablero con la fecha actual del sistema. */
export function useDashboard() {
  const [state, setState] = useState({ status: 'loading', dashboard: null, error: '' });
  const request = useRef(0);

  const load = useCallback(async () => {
    const current = ++request.current;
    setState((previous) => ({ ...previous, status: 'loading', error: '' }));
    try {
      const dashboard = buildDashboard(await fetchWorkbook(), todayCalendarDay());
      if (current === request.current) setState({ status: 'ready', dashboard, error: '' });
    } catch (error) {
      if (current !== request.current) return;
      const message = error instanceof WorkbookError ? error.message : 'Ocurrió un error inesperado al procesar los datos.';
      setState({ status: 'error', dashboard: null, error: message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
