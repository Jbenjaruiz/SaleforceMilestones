import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './database.config';
import { InitialSchema1792432800000 } from './migrations/1792432800000-InitialSchema';

const env = { DB_HOST: 'localhost', DB_NAME: 'tracker', DB_USER: 'sa', DB_PASSWORD: 'secret' };

// Builds the entity metadata without connecting, so a broken relation or column fails here and not in production.
async function metadata() {
  const ds = new DataSource(buildDatabaseOptions(env));
  await (ds as unknown as { buildMetadatas(): Promise<void> }).buildMetadatas();
  return ds;
}

describe('database schema', () => {
  it('maps every table of the ER diagram', async () => {
    const ds = await metadata();
    expect(ds.entityMetadatas.map((m) => m.tableName).sort()).toEqual([
      'attachments',
      'audit_logs',
      'comments',
      'milestones',
      'permissions',
      'project_members',
      'projects',
      'roles',
      'tasks',
      'users',
    ]);
  });

  it('resolves the foreign keys between entities', async () => {
    const ds = await metadata();
    const fks = (table: string) =>
      ds.getMetadata(ds.entityMetadatas.find((m) => m.tableName === table)!.target).foreignKeys.map((fk) => fk.columnNames[0]);

    expect(fks('milestones')).toEqual(expect.arrayContaining(['project_id', 'created_by', 'updated_by']));
    expect(fks('tasks')).toContain('milestone_id');
    expect(fks('comments')).toEqual(expect.arrayContaining(['milestone_id', 'task_id', 'author_id']));
    expect(fks('attachments')).toEqual(expect.arrayContaining(['comment_id', 'task_id', 'uploaded_by']));
  });
});

describe('InitialSchema migration', () => {
  const run = async () => {
    const queries: string[] = [];
    await new InitialSchema1792432800000().up({ query: async (sql: string) => void queries.push(sql) } as never);
    return queries;
  };

  it('creates every table once and in dependency order', async () => {
    const created = (await run()).map((q) => /CREATE TABLE (\w+)/.exec(q)?.[1]).filter(Boolean);
    expect(created).toEqual(['roles', 'permissions', 'users', 'projects', 'milestones', 'tasks', 'comments', 'attachments', 'audit_logs']);
  });

  it('keeps to SQL Server 2012 syntax', async () => {
    const sql = (await run()).join('\n');
    expect(sql).not.toMatch(/IF EXISTS|STRING_AGG|JSON_|DROP\s+\w+\s+IF/i);
  });

  it('declares the business rules as constraints', async () => {
    const sql = (await run()).join('\n');
    expect(sql).toContain('UNIQUE (project_id, code)');
    expect(sql).toContain('CHECK (estimated_date >= start_date)');
    expect(sql).toContain('CK_comments_parent');
    expect(sql).toContain('CK_attachments_parent');
    expect(sql).toContain('size_bytes <= 5242880');
  });
});
