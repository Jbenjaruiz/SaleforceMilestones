import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createReadStream, ReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Files live on disk under STORAGE_DIR, outside anything the frontend serves, and are only reachable
 * through the authenticated download endpoint. The database keeps a relative key, never the user's file name.
 */
@Injectable()
export class AttachmentStorage {
  private readonly logger = new Logger(AttachmentStorage.name);
  readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(process.cwd(), config.get<string>('STORAGE_DIR') || './storage/attachments');
  }

  /** `2026/10/<random>.png`: sharded by month, unguessable, extension decided by the verified type. */
  newKey(extension: string, now = new Date()): string {
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${now.getUTCFullYear()}/${month}/${randomUUID()}.${extension}`;
  }

  async write(key: string, data: Buffer): Promise<void> {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, data, { flag: 'wx' });
  }

  open(key: string): ReadStream {
    return createReadStream(this.resolve(key));
  }

  /** Best effort: a file that cannot be removed is logged, never an error for the user. */
  async removeMany(keys: string[]): Promise<void> {
    await Promise.all(
      keys.map(async (key) => {
        try {
          await rm(this.resolve(key), { force: true });
        } catch (error) {
          this.logger.warn(`Could not delete stored file ${key}: ${(error as Error).message}`);
        }
      }),
    );
  }

  /** Refuses any key that would leave the storage folder. */
  private resolve(key: string): string {
    const target = path.resolve(this.root, key);
    if (target !== this.root && !target.startsWith(this.root + path.sep)) {
      throw new Error('Invalid storage key.');
    }
    return target;
  }
}
