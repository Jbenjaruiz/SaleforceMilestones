import { useMemo, useState } from 'react';
import AlertsPanel from './components/AlertsPanel.jsx';
import Filters from './components/Filters.jsx';
import Header from './components/Header.jsx';
import KpiCards from './components/KpiCards.jsx';
import MilestoneTable from './components/MilestoneTable.jsx';
import { ErrorState, LoadingState } from './components/States.jsx';
import { useDashboard } from './hooks/useDashboard.js';
import { filterMilestones } from './utils/dashboard.js';

const PROVISIONAL = /demo|borrador/i;

export default function App() {
  const { status, dashboard, error, reload } = useDashboard();
  const [filters, setFilters] = useState({ status: 'all', delay: 'all' });
  const visible = useMemo(() => (dashboard ? filterMilestones(dashboard.milestones, filters) : []), [dashboard, filters]);

  const version = dashboard?.config.VersionDatos ?? '';
  const notice = PROVISIONAL.test(version)
    ? `Versión de datos: ${version}. Las fechas, los responsables y el estado de ejecución están por confirmar; no representan compromisos aprobados.`
    : '';

  return (
    <>
      <Header config={dashboard?.config} loading={status === 'loading'} onReload={reload} />
      <main className="container main">
        {status === 'error' && <ErrorState message={error} onRetry={reload} />}
        {status === 'loading' && !dashboard && <LoadingState />}
        {dashboard && (
          <>
            <AlertsPanel alerts={dashboard.alerts} notice={notice} />
            <KpiCards summary={dashboard.summary} />
            <section aria-labelledby="hitos-title">
              <div className="section-head">
                <div>
                  <h2 id="hitos-title">Hitos del proyecto</h2>
                  <p>Seleccione «Ver tareas» para consultar el detalle y los controles de cambio de origen.</p>
                </div>
                <Filters filters={filters} onChange={setFilters} />
              </div>
              <MilestoneTable rows={visible} total={dashboard.milestones.length} />
            </section>
          </>
        )}
      </main>
      <footer className="footer container">
        <p>Vista de solo lectura generada a partir de <code>seguimiento_salesforce.xlsx</code>. El avance y los retrasos se calculan en el navegador con la fecha actual.</p>
      </footer>
    </>
  );
}
