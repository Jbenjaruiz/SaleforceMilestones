import Icon from './Icon.jsx';

export function LoadingState() {
  return (
    <div className="state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>Leyendo el libro de seguimiento…</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <Icon name="alert" />
      <div>
        <h2>No se pudieron cargar los datos</h2>
        <p>{message}</p>
        <p className="state__hint">Verifique que el archivo exista en <code>public/data/seguimiento_salesforce.xlsx</code> y conserve las hojas Configuracion, Hitos y Tareas.</p>
      </div>
      <button type="button" className="button" onClick={onRetry}>Reintentar</button>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}
