import { formatDays, formatPercent } from '../utils/format.js';
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
  const { overallProgress, milestonesWithProgress, milestoneCount, finishedMilestones, taskCount, completedTasks, delayDays, delayedTaskCount } = summary;
  const excluded = milestoneCount - milestonesWithProgress;

  return (
    <section className="kpis" aria-label="Indicadores del proyecto completo">
      <Card icon="progress" tone="brand" label="Avance global" value={formatPercent(overallProgress)}
        caption={excluded > 0
          ? `Calculado con ${milestonesWithProgress} de ${milestoneCount} hitos; ${excluded} sin tareas no participan.`
          : `Promedio de los ${milestoneCount} hitos, todos con el mismo peso.`}>
        <div className="progress__track" aria-hidden="true"><span className="progress__bar" style={{ width: `${overallProgress ?? 0}%` }} /></div>
      </Card>
      <Card icon="check" tone="done" label="Hitos finalizados" value={<>{finishedMilestones}<small> de {milestoneCount}</small></>}
        caption="Un hito termina cuando todas sus tareas están finalizadas." />
      <Card icon="clock" tone="late" label="Retraso acumulado" value={<>{delayDays}<small> {delayDays === 1 ? 'día' : 'días'}</small></>}
        caption={delayedTaskCount > 0
          ? `Suma del retraso de ${delayedTaskCount} ${delayedTaskCount === 1 ? 'tarea atrasada' : 'tareas atrasadas'}.`
          : `Ninguna tarea está atrasada${delayDays === 0 ? '' : ` (${formatDays(delayDays)})`}.`} />
      <Card icon="tasks" tone="neutral" label="Tareas finalizadas" value={<>{completedTasks}<small> de {taskCount}</small></>}
        caption="Suma de tareas de todos los hitos." />
    </section>
  );
}
