import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';
import { ADMIN, dashboard, EDITOR, mockApi, permissionsFor, REVIEWER, signedInAs } from './test/mockApi.js';

const attachment = (overrides = {}) => ({
  id: 'a1', taskId: 't1', commentId: null, fileName: 'captura.png', contentType: 'image/png', sizeBytes: 2048,
  uploadedBy: { id: 'u-ed', fullName: 'Eva Editora' }, createdAt: '2026-10-19T15:30:00Z', ...overrides,
});
const comment = (overrides = {}) => ({
  id: 'c1', milestoneId: null, taskId: 't1', author: { id: 'u-ed', fullName: 'Eva Editora' }, body: 'Se validó con el cliente',
  createdAt: '2026-10-19T15:30:00Z', attachments: [], ...overrides,
});

const PROJECTS = [{ id: 'p1', name: 'CC-001 Rev. 3', description: null, isArchived: false, createdAt: '2026-10-01T00:00:00Z' }];

beforeEach(() => { window.location.hash = '#/'; localStorage.clear(); });
afterEach(() => vi.unstubAllGlobals());

const setup = (user, extra = {}) => mockApi({
  ...signedInAs(user),
  'GET /projects': PROJECTS,
  'GET /projects/p1/dashboard': dashboard({ permissions: permissionsFor(user) }),
  'GET /tasks/t1/attachments': [],
  'GET /tasks/t1/comments': [],
  'GET /milestones/m1/comments': [],
  ...extra,
});

async function openTaskActivity(user) {
  await screen.findByText('Stock por bodega');
  await user.click(within(screen.getByRole('table')).getByText('CC-C01').closest('tr').querySelector('button.toggle'));
  await user.click(screen.getByRole('button', { name: 'Comentarios y adjuntos de «Definir regla de precios»' }));
  return screen.getByRole('dialog');
}

const png = (name = 'foto.png') => new File([new Uint8Array(10)], name, { type: 'image/png' });

describe('comentarios y adjuntos', () => {
  it('lista los adjuntos de la tarea y los comentarios con los suyos', async () => {
    const user = userEvent.setup();
    setup(EDITOR, {
      'GET /tasks/t1/attachments': [attachment()],
      'GET /tasks/t1/comments': [comment({ attachments: [attachment({ id: 'a2', taskId: null, commentId: 'c1', fileName: 'acta.pdf', contentType: 'application/pdf' })] })],
    });
    render(<App />);
    const dialog = await openTaskActivity(user);

    expect(await within(dialog).findByText('captura.png')).toBeInTheDocument();
    expect(within(dialog).getByText(/1 de 5/)).toBeInTheDocument();
    expect(await within(dialog).findByText('Se validó con el cliente')).toBeInTheDocument();
    expect(within(dialog).getByText('acta.pdf')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Descargar «acta.pdf»' })).toBeInTheDocument();
  });

  it('publica un comentario solo con texto', async () => {
    const user = userEvent.setup();
    const api = setup(EDITOR, { 'POST /tasks/t1/comments': comment({ id: 'new' }) });
    render(<App />);
    const dialog = await openTaskActivity(user);
    await user.type(await within(dialog).findByLabelText('Nuevo comentario'), '  Revisado  ');
    await user.click(within(dialog).getByRole('button', { name: 'Publicar comentario' }));

    await waitFor(() => expect(api.called('POST /tasks/t1/comments')).toHaveLength(1));
    expect(api.called('POST /tasks/t1/comments')[0].body).toEqual({ body: 'Revisado' });
  });

  it('publica un comentario con archivos como multipart', async () => {
    const user = userEvent.setup();
    const api = setup(EDITOR, { 'POST /tasks/t1/comments': comment({ id: 'new' }) });
    render(<App />);
    const dialog = await openTaskActivity(user);
    await user.type(await within(dialog).findByLabelText('Nuevo comentario'), 'Con evidencia');
    await user.upload(within(dialog).getByLabelText('Adjuntar archivos'), [png('uno.png'), png('dos.png')]);
    expect(within(dialog).getByText('uno.png')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Publicar comentario' }));

    await waitFor(() => expect(api.called('POST /tasks/t1/comments')).toHaveLength(1));
    const form = api.called('POST /tasks/t1/comments')[0].body;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('body')).toBe('Con evidencia');
    expect(form.getAll('files').map((file) => file.name)).toEqual(['uno.png', 'dos.png']);
  });

  it('avisa antes de enviar si un archivo no es de un tipo permitido o pesa demasiado', async () => {
    const user = userEvent.setup({ applyAccept: false });
    setup(EDITOR);
    render(<App />);
    const dialog = await openTaskActivity(user);
    const picker = await within(dialog).findByLabelText('Adjuntar archivos');

    await user.upload(picker, new File(['hola'], 'notas.txt', { type: 'text/plain' }));
    expect(await within(dialog).findByText(/«notas.txt» no se puede adjuntar/)).toBeInTheDocument();

    const big = new File([new Uint8Array(10)], 'enorme.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await user.upload(picker, big);
    expect(await within(dialog).findByText(/«enorme.png» pesa más de 5 MB/)).toBeInTheDocument();

    await user.upload(picker, Array.from({ length: 6 }, (_, i) => png(`f${i}.png`)));
    expect(await within(dialog).findByText(/como máximo 5 adjuntos/)).toBeInTheDocument();
  });

  it('un usuario de solo lectura ve los comentarios pero no puede comentar ni adjuntar', async () => {
    const user = userEvent.setup();
    setup(REVIEWER, { 'GET /tasks/t1/comments': [comment()] });
    render(<App />);
    const dialog = await openTaskActivity(user);
    expect(await within(dialog).findByText('Se validó con el cliente')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Nuevo comentario')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Elegir archivos')).not.toBeInTheDocument();
  });

  it('solo el autor o un administrador pueden borrar un comentario', async () => {
    const user = userEvent.setup();
    const comments = [comment(), comment({ id: 'c2', author: { id: 'u-otro', fullName: 'Otro Usuario' }, body: 'Nota ajena' })];
    setup(EDITOR, { 'GET /tasks/t1/comments': comments });
    const { unmount } = render(<App />);
    let dialog = await openTaskActivity(user);
    await within(dialog).findByText('Nota ajena');
    expect(within(dialog).getByRole('button', { name: 'Eliminar el comentario de Eva Editora' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Eliminar el comentario de Otro Usuario' })).not.toBeInTheDocument();
    unmount();

    setup(ADMIN, { 'GET /tasks/t1/comments': comments });
    render(<App />);
    dialog = await openTaskActivity(userEvent.setup());
    await within(dialog).findByText('Nota ajena');
    expect(within(dialog).getByRole('button', { name: 'Eliminar el comentario de Otro Usuario' })).toBeInTheDocument();
  });

  it('borra un comentario tras confirmarlo', async () => {
    const user = userEvent.setup();
    const api = setup(EDITOR, { 'GET /tasks/t1/comments': [comment()], 'DELETE /comments/c1': null });
    render(<App />);
    const dialog = await openTaskActivity(user);
    await user.click(await within(dialog).findByRole('button', { name: 'Eliminar el comentario de Eva Editora' }));
    const confirm = screen.getByRole('dialog', { name: 'Eliminar comentario' });
    expect(api.called('DELETE /comments/c1')).toHaveLength(0);
    await user.click(within(confirm).getByRole('button', { name: 'Eliminar comentario' }));
    await waitFor(() => expect(api.called('DELETE /comments/c1')).toHaveLength(1));
  });

  it('sube archivos a la tarea y respeta el tope de 5', async () => {
    const user = userEvent.setup();
    const api = setup(EDITOR, { 'GET /tasks/t1/attachments': [attachment()], 'POST /tasks/t1/attachments': [attachment()] });
    render(<App />);
    const dialog = await openTaskActivity(user);
    await user.upload(await within(dialog).findByLabelText('Elegir archivos'), [png('a.png'), png('b.png')]);
    await user.click(within(dialog).getByRole('button', { name: 'Subir 2 archivos' }));
    await waitFor(() => expect(api.called('POST /tasks/t1/attachments')).toHaveLength(1));
    expect(api.called('POST /tasks/t1/attachments')[0].body.getAll('files')).toHaveLength(2);

    await user.upload(within(dialog).getByLabelText('Elegir archivos'), [png('c.png'), png('d.png'), png('e.png'), png('f.png'), png('g.png')]);
    expect(await within(dialog).findByText(/como máximo 5 adjuntos \(ya hay 1\)/)).toBeInTheDocument();
  });

  it('quien subió un adjunto, y el administrador, pueden borrarlo; los demás no', async () => {
    const user = userEvent.setup();
    const attachments = [attachment(), attachment({ id: 'a9', fileName: 'ajeno.pdf', contentType: 'application/pdf', uploadedBy: { id: 'u-otro', fullName: 'Otro' } })];
    const api = setup(EDITOR, { 'GET /tasks/t1/attachments': attachments, 'DELETE /attachments/a1': null });
    const { unmount } = render(<App />);
    const dialog = await openTaskActivity(user);
    await within(dialog).findByText('ajeno.pdf');
    expect(within(dialog).queryByRole('button', { name: 'Eliminar el adjunto «ajeno.pdf»' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar el adjunto «captura.png»' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Eliminar adjunto' })).getByRole('button', { name: 'Eliminar adjunto' }));
    await waitFor(() => expect(api.called('DELETE /attachments/a1')).toHaveLength(1));
    unmount();

    setup(ADMIN, { 'GET /tasks/t1/attachments': attachments });
    render(<App />);
    const adminDialog = await openTaskActivity(userEvent.setup());
    await within(adminDialog).findByText('ajeno.pdf');
    expect(within(adminDialog).getByRole('button', { name: 'Eliminar el adjunto «ajeno.pdf»' })).toBeInTheDocument();
  });

  it('abre los comentarios de un hito (sin adjuntos directos)', async () => {
    const user = userEvent.setup();
    setup(EDITOR, { 'GET /milestones/m1/comments': [comment({ id: 'c5', taskId: null, milestoneId: 'm1', body: 'Nota del hito' })] });
    render(<App />);
    await screen.findByText('Stock por bodega');
    await user.click(within(screen.getByRole('table')).getByText('CC-C01').closest('tr').querySelector('button.toggle'));
    await user.click(screen.getByRole('button', { name: /Comentarios del hito/ }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Nota del hito')).toBeInTheDocument();
    expect(within(dialog).queryByText(/Adjuntos de la tarea/)).not.toBeInTheDocument();
  });
});
