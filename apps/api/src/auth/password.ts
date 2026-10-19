import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

export const BCRYPT_ROUNDS = 12;
export const MIN_PASSWORD_LENGTH = 7;
/** bcrypt ignores everything after 72 bytes, so longer passwords would silently be truncated. */
export const MAX_PASSWORD_LENGTH = 72;

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
