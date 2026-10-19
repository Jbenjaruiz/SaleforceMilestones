import { useState } from 'react';
import Modal from './Modal.jsx';

/** Ejecuta una acción asíncrona guardando su estado de envío y el error en español para mostrarlo en el formulario. */
export function useSubmit(action) {
  const [state, setState] = useState({ busy: false, error: '' });
  const submit = async (event) => {
    event?.preventDefault();
    setState({ busy: true, error: '' });
    try {
      await action();
    } catch (error) {
      setState({ busy: false, error: error.message || 'No se pudo completar la acción.' });
      return;
    }
    setState({ busy: false, error: '' });
  };
  return { ...state, submit };
}

export function FormError({ message }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}

export function Field({ label, hint, children }) {
  return (
    <label className="field field--form">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function FormActions({ busy, submitLabel, onCancel }) {
  return (
    <div className="form-actions">
      <button type="button" className="button button--ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
      <button type="submit" className="button" disabled={busy}>{busy ? 'Guardando…' : submitLabel}</button>
    </div>
  );
}

export function MilestoneForm({ milestone, onSave, onClose }) {
  const [values, setValues] = useState({ code: milestone?.code ?? '', name: milestone?.name ?? '', description: milestone?.description ?? '' });
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const { busy, error, submit } = useSubmit(async () => {
    await onSave({ code: values.code.trim(), name: values.name.trim(), description: values.description.trim() });
    onClose();
  });

  return (
    <Modal title={milestone ? `Editar hito ${milestone.code}` : 'Nuevo hito'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Código del control de cambio" hint="Por ejemplo CC-C01. Debe ser único dentro del proyecto.">
          <input value={values.code} onChange={set('code')} required maxLength={30} autoComplete="off" />
        </Field>
        <Field label="Nombre"><input value={values.name} onChange={set('name')} required maxLength={300} /></Field>
        <Field label="Descripción (opcional)"><textarea value={values.description} onChange={set('description')} rows={3} maxLength={2000} /></Field>
        <FormError message={error} />
        <FormActions busy={busy} submitLabel="Guardar hito" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export function TaskForm({ milestone, task, onSave, onClose }) {
  const [values, setValues] = useState({
    name: task?.name ?? '', responsible: task?.responsible ?? '', startDate: task?.startDate ?? '', estimatedDate: task?.estimatedDate ?? '',
  });
  const [localError, setLocalError] = useState('');
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));
  const { busy, error, submit } = useSubmit(async () => {
    if (values.estimatedDate < values.startDate) { setLocalError('La fecha estimada no puede ser anterior a la de inicio.'); return; }
    setLocalError('');
    await onSave({ name: values.name.trim(), responsible: values.responsible.trim(), startDate: values.startDate, estimatedDate: values.estimatedDate });
    onClose();
  });

  return (
    <Modal title={task ? 'Editar tarea' : `Nueva tarea en ${milestone.code}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Nombre de la tarea"><input value={values.name} onChange={set('name')} required maxLength={500} /></Field>
        <Field label="Responsable (opcional)"><input value={values.responsible} onChange={set('responsible')} maxLength={200} /></Field>
        <div className="form-row">
          <Field label="Fecha de inicio"><input type="date" value={values.startDate} onChange={set('startDate')} required /></Field>
          <Field label="Fecha estimada de entrega"><input type="date" value={values.estimatedDate} onChange={set('estimatedDate')} required /></Field>
        </div>
        <FormError message={localError || error} />
        <FormActions busy={busy} submitLabel="Guardar tarea" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }) {
  const { busy, error, submit } = useSubmit(async () => {
    await onConfirm();
    onClose();
  });
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="confirm-text">{children}</div>
        <FormError message={error} />
        <div className="form-actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="button button--danger" disabled={busy}>{busy ? 'Procesando…' : confirmLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
