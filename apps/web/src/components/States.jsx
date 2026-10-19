import Icon from './Icon.jsx';

export function LoadingState({ children = 'Cargando…' }) {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function ErrorState({ title = 'No se pudieron cargar los datos', message, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <Icon name="alert" />
      <div>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {onRetry && <button type="button" className="button" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}
