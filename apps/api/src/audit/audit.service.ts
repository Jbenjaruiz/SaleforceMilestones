import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export interface AuditEntry {
  userId: string;
  entity: string;
  entityId?: string | null;
  action: string;
  /** Previous and new values. Never include passwords or hashes. */
  changes?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  /** Pass the transaction's manager so the audit row commits or rolls back with the change it describes. */
  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repository = manager ? manager.getRepository(AuditLog) : this.logs;
    await repository.insert({
      userId: entry.userId,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      action: entry.action,
      changesJson: entry.changes ? JSON.stringify(entry.changes) : null,
    });
  }
}
