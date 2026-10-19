import { formatPercent } from '../utils/progress.js';
import Icon from './Icon.jsx';

function Card({ icon, tone, label, value, caption, children }) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <div className="kpi__head">
        <h3>{label}</h3>
        <span className="kpi__icon"><Icon name={icon} /></span>
      </div>
      <p className="kpi__value">{value}</p>
      {children}
      <p className="kpi__caption">{caption}</p>
    </article>
  );
}

export default function KpiCards({ summary }) {
  const { overall, included, total, finished, late, unknownDelay, tasks, tasksDone } = summary;
  const excluded = total - included;

  return (
    <section className="kpis" aria-label="Indicadores del proyecto completo">
      <Card icon="progress" tone="brand" label="Avance global" value={formatPercent(overall)}
        caption={excluded > 0
          ? `Calculado con ${included} de ${total} hitos; ${excluded} sin tareas válidas no participan.`
          : `Promedio de los ${total} hitos, todos con el mismo peso.`}>
        <div className="progress__track" aria-hidden="true"><span className="progress__bar" style={{ width: `${overall ?? 0}%` }} /></div>
      </Card>
      <Card icon="check" tone="done" label="Hitos finalizados" value={<>{finished}<small> de {total}</small></>}
        caption="Según el estado registrado manualmente en el Excel." />
      <Card icon="clock" tone="late" label="Hitos retrasados" value={late}
        caption={unknownDelay > 0
          ? `${unknownDelay} ${unknownDelay === 1 ? 'hito' : 'hitos'} sin datos suficientes para calcular el retraso.`
          : 'Fecha estimada vencida respecto a hoy, o entregados fuera de fecha.'} />
      <Card icon="tasks" tone="neutral" label="Tareas completadas" value={<>{tasksDone}<small> de {tasks}</small></>}
        caption="Suma de tareas de todos los hitos." />
    </section>
  );
}
