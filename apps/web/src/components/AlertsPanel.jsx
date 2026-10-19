import Icon from './Icon.jsx';

/** Avisos de coherencia: hoy solo los hitos que todavía no tienen tareas. */
export default function AlertsPanel({ alerts }) {
  if (!alerts.length) return null;
  return (
    <section className="alerts" aria-label="Avisos sobre los datos">
      <details className="alerts__details">
        <summary>
          <Icon name="alert" />
          {alerts.length} {alerts.length === 1 ? 'hito sin tareas' : 'hitos sin tareas'}
        </summary>
        <ul>
          {alerts.map((alert) => (
            <li key={alert.milestoneId}><strong>{alert.code}</strong> todavía no tiene tareas: no tiene avance ni fechas y no participa en el avance global.</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
