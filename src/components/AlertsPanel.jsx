import Icon from './Icon.jsx';

export default function AlertsPanel({ alerts, notice }) {
  if (!alerts.length && !notice) return null;
  return (
    <section className="alerts" aria-label="Avisos sobre los datos">
      {notice && (
        <div className="notice">
          <Icon name="info" />
          <p>{notice}</p>
        </div>
      )}
      {alerts.length > 0 && (
        <details className="alerts__details">
          <summary>
            <Icon name="alert" />
            {alerts.length} {alerts.length === 1 ? 'aviso' : 'avisos'} de coherencia en los datos
          </summary>
          <ul>
            {alerts.map((alert, index) => (
              <li key={`${alert.scope}-${index}`}><strong>{alert.scope}</strong> {alert.message}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
