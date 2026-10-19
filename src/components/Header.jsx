import { formatDay, parseCalendarDay } from '../utils/dates.js';
import Icon from './Icon.jsx';

export default function Header({ config, loading, onReload }) {
  const cutoff = config ? formatDay(parseCalendarDay(config.FechaCorte) || null) : null;
  const title = config?.NombreProyecto || 'Seguimiento de Desarrollo Salesforce';

  return (
    <header className="header">
      <div className="container header__inner">
        <img className="header__logo" src={`${import.meta.env.BASE_URL}images/lucalza-logo.png`} alt="Lucalza" width="124" height="51" />
        <div className="header__title">
          <p className="eyebrow">Tablero ejecutivo</p>
          <h1>{title}</h1>
        </div>
        <div className="header__meta">
          <dl>
            <div><dt>Fecha de corte</dt><dd>{cutoff ?? '—'}</dd></div>
            {config?.VersionDatos && <div><dt>Versión de datos</dt><dd>{config.VersionDatos}</dd></div>}
          </dl>
          <button type="button" className="button button--light" onClick={onReload} disabled={loading}>
            <Icon name="refresh" />
            {loading ? 'Actualizando…' : 'Actualizar datos'}
          </button>
        </div>
      </div>
    </header>
  );
}
