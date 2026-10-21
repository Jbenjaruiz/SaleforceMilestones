import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { useResource } from '../hooks/useResource.js';
import { formatBytes, formatDateTime } from '../utils/format.js';
import { ConfirmDialog, FormError, useSubmit } from './Forms.jsx';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';
import { LoadingState } from './States.jsx';

// Mismos límites que la API (que es la que decide): se avisa antes para no subir en vano.
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = { 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP', 'application/pdf': 'PDF' };
const ACCEPT = Object.keys(ALLOWED).join(',');

/** Revisa tipo, tamaño y cantidad antes de enviar. Devuelve el mensaje del primer problema o `''`. */
export function checkFiles(files, alreadyAttached = 0) {
  if (alreadyAttached + files.length > MAX_FILES) return `Se permiten como máximo ${MAX_FILES} adjuntos (ya hay ${alreadyAttached}).`;
  const wrongType = files.find((file) => !ALLOWED[file.type]);
  if (wrongType) return `«${wrongType.name}» no se puede adjuntar: solo se permiten PNG, JPG, WebP y PDF.`;
  const tooBig = files.find((file) => file.size > MAX_BYTES);
  if (tooBig) return `«${tooBig.name}» pesa más de 5 MB.`;
  return '';
}

function useObjectUrl(path, enabled) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let created = null;
    let active = true;
    api.blob(path).then((blob) => { if (active) { created = URL.createObjectURL(blob); setUrl(created); } }).catch(() => {});
    return () => { active = false; if (created) URL.revokeObjectURL(created); };
  }, [path, enabled]);
  return url;
}

/** Las imágenes se piden con la sesión y se muestran como miniatura; el PDF solo se descarga. */
function AttachmentItem({ attachment, canDelete, onDelete }) {
  const path = `/attachments/${attachment.id}/download`;
  const isImage = attachment.contentType.startsWith('image/');
  const thumbnail = useObjectUrl(path, isImage);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setError('');
    try {
      const url = URL.createObjectURL(await api.blob(path));
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.fileName;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e.message); }
  };

  return (
    <li className="attachment">
      {isImage ? (
        <button type="button" className="attachment__thumb" onClick={() => thumbnail && setPreview(true)} aria-label={`Ver «${attachment.fileName}»`} disabled={!thumbnail}>
          {thumbnail ? <img src={thumbnail} alt="" /> : <span className="spinner" aria-hidden="true" />}
        </button>
      ) : (
        <span className="attachment__thumb attachment__thumb--file" aria-hidden="true">PDF</span>
      )}
      <div className="attachment__info">
        <p className="attachment__name">{attachment.fileName}</p>
        <p className="attachment__meta">{formatBytes(attachment.sizeBytes)} · {attachment.uploadedBy.fullName} · {formatDateTime(attachment.createdAt)}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <button type="button" className="icon-button" onClick={download} aria-label={`Descargar «${attachment.fileName}»`} title="Descargar"><Icon name="download" /></button>
      {canDelete && <button type="button" className="icon-button icon-button--danger" onClick={() => onDelete(attachment)} aria-label={`Eliminar el adjunto «${attachment.fileName}»`} title="Eliminar"><Icon name="trash" /></button>}
      {preview && (
        <Modal title={attachment.fileName} onClose={() => setPreview(false)} wide>
          <img className="attachment__full" src={thumbnail} alt={attachment.fileName} />
        </Modal>
      )}
    </li>
  );
}

function AttachmentList({ attachments, onDelete }) {
  const { user } = useAuth();
  if (!attachments.length) return null;
  return (
    <ul className="attachments">
      {attachments.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} canDelete={user.isAdmin || attachment.uploadedBy.id === user.id} onDelete={onDelete} />
      ))}
    </ul>
  );
}

function FilePicker({ files, onChange, alreadyAttached = 0, label = 'Adjuntar archivos' }) {
  const input = useRef(null);
  const [problem, setProblem] = useState('');
  const pick = (event) => {
    const chosen = [...event.target.files];
    event.target.value = '';
    const message = checkFiles([...files, ...chosen], alreadyAttached);
    setProblem(message);
    if (!message) onChange([...files, ...chosen]);
  };
  return (
    <div className="picker">
      <input ref={input} type="file" multiple accept={ACCEPT} onChange={pick} className="sr-only" aria-label={label} />
      <button type="button" className="button button--small button--ghost" onClick={() => input.current.click()}><Icon name="paperclip" />{label}</button>
      {files.map((file) => (
        <span className="chip" key={`${file.name}-${file.size}`}>
          {file.name}
          <button type="button" className="chip__remove" onClick={() => onChange(files.filter((f) => f !== file))} aria-label={`Quitar «${file.name}»`}><Icon name="close" /></button>
        </span>
      ))}
      {problem && <p className="form-error" role="alert">{problem}</p>}
    </div>
  );
}

function CommentForm({ onSubmit }) {
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const { busy, error, submit } = useSubmit(async () => {
    await onSubmit(body.trim(), files);
    setBody('');
    setFiles([]);
  });

  return (
    <form className="form comment-form" onSubmit={submit}>
      <label className="field field--form">
        <span>Nuevo comentario</span>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={4000} required placeholder="Escriba una nota o actualización…" />
      </label>
      <FilePicker files={files} onChange={setFiles} />
      <small className="muted">Los comentarios no se pueden editar, solo borrar. Los adjuntos se agregan al crearlo.</small>
      <FormError message={error} />
      <div className="form-actions"><button type="submit" className="button" disabled={busy || !body.trim()}>{busy ? 'Publicando…' : 'Publicar comentario'}</button></div>
    </form>
  );
}

function Comments({ base, canComment, onChanged }) {
  const { user } = useAuth();
  const comments = useResource(() => api.get(`${base}/comments`), base);
  const [toDelete, setToDelete] = useState(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);

  const publish = async (body, files) => {
    if (files.length === 0) await api.post(`${base}/comments`, { body });
    else {
      const form = new FormData();
      form.append('body', body);
      files.forEach((file) => form.append('files', file));
      await api.upload(`${base}/comments`, form);
    }
    await comments.refresh();
    onChanged?.();
  };

  return (
    <section aria-label="Comentarios">
      <h3>Comentarios</h3>
      {comments.status === 'loading' && <LoadingState>Cargando comentarios…</LoadingState>}
      {comments.status === 'error' && <FormError message={comments.error} />}
      {comments.data?.length === 0 && <p className="muted">Todavía no hay comentarios.</p>}
      <ul className="comments">
        {comments.data?.map((comment) => (
          <li className="comment" key={comment.id}>
            <div className="comment__head">
              <strong>{comment.author.fullName}</strong>
              <span className="muted">{formatDateTime(comment.createdAt)}</span>
              {(user.isAdmin || comment.author.id === user.id) && (
                <button type="button" className="icon-button icon-button--danger" onClick={() => setToDelete(comment)} aria-label={`Eliminar el comentario de ${comment.author.fullName}`} title="Eliminar comentario"><Icon name="trash" /></button>
              )}
            </div>
            <p className="comment__body">{comment.body}</p>
            <AttachmentList attachments={comment.attachments} onDelete={setAttachmentToDelete} />
          </li>
        ))}
      </ul>
      {canComment && <CommentForm onSubmit={publish} />}
      {attachmentToDelete && (
        <ConfirmDialog title="Eliminar adjunto" confirmLabel="Eliminar adjunto" onClose={() => setAttachmentToDelete(null)}
          onConfirm={async () => { await api.delete(`/attachments/${attachmentToDelete.id}`); await comments.refresh(); }}>
          <p>Se eliminará el archivo <strong>«{attachmentToDelete.fileName}»</strong>. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
      {toDelete && (
        <ConfirmDialog title="Eliminar comentario" confirmLabel="Eliminar comentario" onClose={() => setToDelete(null)}
          onConfirm={async () => { await api.delete(`/comments/${toDelete.id}`); await comments.refresh(); onChanged?.(); }}>
          <p>Se eliminará el comentario de <strong>{toDelete.author.fullName}</strong>{toDelete.attachments.length > 0 ? ` y sus ${toDelete.attachments.length} adjuntos` : ''}. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function TaskAttachments({ taskId, canUpload }) {
  const attachments = useResource(() => api.get(`/tasks/${taskId}/attachments`), taskId);
  const [files, setFiles] = useState([]);
  const [toDelete, setToDelete] = useState(null);
  const count = attachments.data?.length ?? 0;
  const { busy, error, submit } = useSubmit(async () => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    await api.upload(`/tasks/${taskId}/attachments`, form);
    setFiles([]);
    await attachments.refresh();
  });

  return (
    <section aria-label="Adjuntos de la tarea">
      <h3>Adjuntos de la tarea <span className="muted">({count} de {MAX_FILES})</span></h3>
      {attachments.status === 'loading' && <LoadingState>Cargando adjuntos…</LoadingState>}
      {attachments.status === 'error' && <FormError message={attachments.error} />}
      {attachments.data?.length === 0 && <p className="muted">La tarea no tiene adjuntos.</p>}
      {attachments.data && <AttachmentList attachments={attachments.data} onDelete={setToDelete} />}
      {canUpload && count < MAX_FILES && (
        <form className="form" onSubmit={submit}>
          <FilePicker files={files} onChange={setFiles} alreadyAttached={count} label="Elegir archivos" />
          <FormError message={error} />
          {files.length > 0 && <div className="form-actions"><button type="submit" className="button" disabled={busy}><Icon name="upload" />{busy ? 'Subiendo…' : `Subir ${files.length} ${files.length === 1 ? 'archivo' : 'archivos'}`}</button></div>}
        </form>
      )}
      {toDelete && (
        <ConfirmDialog title="Eliminar adjunto" confirmLabel="Eliminar adjunto" onClose={() => setToDelete(null)}
          onConfirm={async () => { await api.delete(`/attachments/${toDelete.id}`); await attachments.refresh(); }}>
          <p>Se eliminará el archivo <strong>«{toDelete.fileName}»</strong>. Esta acción no se puede deshacer.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

/** Ventana de comentarios (hitos y tareas) y, en las tareas, de adjuntos directos. */
/** `permissions` son los del usuario en el proyecto: comentar requiere Crear y adjuntar a la tarea requiere Modificar. */
export default function ActivityModal({ target, permissions, onClose }) {
  const isTask = target.type === 'task';
  return (
    <Modal title={isTask ? `Tarea: ${target.title}` : `Hito ${target.title}`} onClose={onClose} wide>
      <div className="activity">
        {isTask && <TaskAttachments taskId={target.id} canUpload={permissions.update} />}
        <Comments base={`/${isTask ? 'tasks' : 'milestones'}/${target.id}`} canComment={permissions.create} />
      </div>
    </Modal>
  );
}
