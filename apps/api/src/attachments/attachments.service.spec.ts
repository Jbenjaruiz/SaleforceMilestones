import { BadRequestException, ForbiddenException, PayloadTooLargeException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { AttachmentsService } from './attachments.service';

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const file = (overrides: Partial<Express.Multer.File> = {}) =>
  ({ originalname: 'foto.png', mimetype: 'image/png', size: png.length, buffer: png, ...overrides }) as Express.Multer.File;
const user = (id: string, isAdmin = false) => ({ id, isAdmin }) as AuthenticatedUser;

function setup(stored = { id: 'a1', uploadedBy: 'uploader', taskId: 't1', commentId: null, fileName: 'foto.png', storageKey: '2026/10/a.png' }) {
  const repository = { findOne: async () => stored };
  const deleted: unknown[] = [];
  const manager = { getRepository: () => ({ delete: async (x: unknown) => void deleted.push(x) }) };
  const storage = { removeMany: jest.fn(), newKey: () => 'k', write: jest.fn() };
  const access = { task: jest.fn(async () => ({})), comment: jest.fn(async () => ({})) };
  const audit = { record: jest.fn() };
  const dataSource = { transaction: async (fn: (m: unknown) => unknown) => fn(manager) };
  const service = new AttachmentsService(repository as never, storage as never, access as never, audit as never, dataSource as never);
  return { service, storage, access, deleted, audit };
}

describe('AttachmentsService.prepare', () => {
  const { service } = setup();

  it('accepts valid files and identifies them by content', () => {
    const [prepared] = service.prepare([file({ originalname: 'truco.exe', mimetype: 'application/x-msdownload' })]);
    expect(prepared).toMatchObject({ contentType: 'image/png', extension: 'png', fileName: 'truco.exe' });
  });

  it('rejects a file whose content is not an allowed type, whatever it claims to be', () => {
    const fake = file({ originalname: 'foto.png', mimetype: 'image/png', buffer: Buffer.from('<?php echo 1; ?>'), size: 16 });
    expect(() => service.prepare([fake])).toThrow(BadRequestException);
  });

  it('rejects files over 5 MB', () => {
    expect(() => service.prepare([file({ size: 5 * 1024 * 1024 + 1 })])).toThrow(PayloadTooLargeException);
  });

  it('allows at most 5 attachments per task or comment, counting the ones already there', () => {
    expect(service.prepare(Array.from({ length: 5 }, () => file()))).toHaveLength(5);
    expect(() => service.prepare(Array.from({ length: 6 }, () => file()))).toThrow(/At most 5/);
    expect(() => service.prepare([file(), file()], 4)).toThrow(/4 already attached/);
    expect(service.prepare([file()], 4)).toHaveLength(1);
  });

  it('treats "no files" as nothing to do', () => {
    expect(service.prepare(undefined)).toEqual([]);
    expect(service.prepare([])).toEqual([]);
  });
});

describe('AttachmentsService.remove', () => {
  it('lets the uploader delete the row and then the file', async () => {
    const { service, deleted, storage } = setup();
    await service.remove('a1', user('uploader'));
    expect(deleted).toContain('a1');
    expect(storage.removeMany).toHaveBeenCalledWith(['2026/10/a.png']);
  });

  it('lets an administrator delete anyone\'s attachment', async () => {
    const { service, audit } = setup();
    await service.remove('a1', user('boss', true));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'attachment', action: 'delete' }), expect.anything());
  });

  it('forbids anyone else, and keeps the file', async () => {
    const { service, storage, deleted } = setup();
    await expect(service.remove('a1', user('other'))).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleted).toHaveLength(0);
    expect(storage.removeMany).not.toHaveBeenCalled();
  });

  it('checks access through the comment when the file belongs to a comment', async () => {
    const { service, access } = setup({ id: 'a2', uploadedBy: 'uploader', taskId: null, commentId: 'c1', fileName: 'x.pdf', storageKey: 'k' } as never);
    await service.remove('a2', user('uploader'));
    expect(access.comment).toHaveBeenCalledWith('c1', expect.anything(), 'read', true);
    expect(access.task).not.toHaveBeenCalled();
  });
});
