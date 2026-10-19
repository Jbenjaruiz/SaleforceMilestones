import { ConfigService } from '@nestjs/config';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { AttachmentStorage } from './attachment-storage';

describe('AttachmentStorage', () => {
  let dir: string;
  let storage: AttachmentStorage;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'attachments-'));
    storage = new AttachmentStorage({ get: () => dir } as unknown as ConfigService);
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('writes under a generated, sharded key and reads it back', async () => {
    const key = storage.newKey('png', new Date('2026-10-19T12:00:00Z'));
    expect(key).toMatch(/^2026\/10\/[0-9a-f-]{36}\.png$/);

    await storage.write(key, Buffer.from('hello'));
    expect((await readFile(path.join(dir, key))).toString()).toBe('hello');
  });

  it('never overwrites an existing file', async () => {
    const key = storage.newKey('pdf');
    await storage.write(key, Buffer.from('one'));
    await expect(storage.write(key, Buffer.from('two'))).rejects.toThrow();
  });

  it('refuses keys that escape the storage folder', async () => {
    await expect(storage.write('../outside.txt', Buffer.from('x'))).rejects.toThrow(/Invalid storage key/);
    expect(() => storage.open('../../etc/passwd')).toThrow(/Invalid storage key/);
    await expect(stat(path.join(dir, '..', 'outside.txt'))).rejects.toThrow();
  });

  it('removes files, ignoring those already gone', async () => {
    const key = storage.newKey('png');
    await storage.write(key, Buffer.from('x'));
    await storage.removeMany([key, '2026/10/does-not-exist.png']);
    await expect(stat(path.join(dir, key))).rejects.toThrow();
  });
});
