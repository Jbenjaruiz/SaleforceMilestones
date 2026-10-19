import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema for F01 (docs/requerimientos/F01-base-de-datos-y-backend.md §5).
 *
 * Written for SQL Server 2012 SP4: no DROP ... IF EXISTS, no JSON functions, no STRING_AGG.
 *
 * Foreign keys use NO ACTION on purpose, except permissions -> roles. SQL Server rejects
 * several cascade paths to the same table (milestones -> tasks -> comments and milestones -> comments),
 * and deleting a milestone must also remove its files from disk. The services delete in order
 * (attachments, comments, tasks, milestone) inside one transaction.
 */
export class InitialSchema1792432800000 implements MigrationInterface {
  name = 'InitialSchema1792432800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const utcNow = 'SYSUTCDATETIME()';
    const statements = [
      `CREATE TABLE roles (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_roles_id DEFAULT NEWSEQUENTIALID(),
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(255) NULL,
        is_protected BIT NOT NULL CONSTRAINT DF_roles_is_protected DEFAULT 0,
        CONSTRAINT PK_roles PRIMARY KEY (id),
        CONSTRAINT UQ_roles_name UNIQUE (name)
      )`,

      `CREATE TABLE permissions (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_permissions_id DEFAULT NEWSEQUENTIALID(),
        role_id UNIQUEIDENTIFIER NOT NULL,
        code NVARCHAR(20) NOT NULL,
        CONSTRAINT PK_permissions PRIMARY KEY (id),
        CONSTRAINT UQ_permissions_role_code UNIQUE (role_id, code),
        CONSTRAINT CK_permissions_code CHECK (code IN ('read', 'create', 'update', 'delete')),
        CONSTRAINT FK_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
      )`,

      `CREATE TABLE users (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWSEQUENTIALID(),
        email NVARCHAR(255) NOT NULL,
        password_hash NVARCHAR(255) NOT NULL,
        full_name NVARCHAR(150) NOT NULL,
        is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT 1,
        role_id UNIQUEIDENTIFIER NOT NULL,
        last_login_at DATETIME2(3) NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT ${utcNow},
        updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT ${utcNow},
        CONSTRAINT PK_users PRIMARY KEY (id),
        CONSTRAINT UQ_users_email UNIQUE (email),
        CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
      )`,
      `CREATE INDEX IX_users_role ON users (role_id)`,

      `CREATE TABLE projects (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_projects_id DEFAULT NEWSEQUENTIALID(),
        name NVARCHAR(200) NOT NULL,
        description NVARCHAR(1000) NULL,
        is_archived BIT NOT NULL CONSTRAINT DF_projects_is_archived DEFAULT 0,
        archived_at DATETIME2(3) NULL,
        archived_by UNIQUEIDENTIFIER NULL,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_projects_created_at DEFAULT ${utcNow},
        CONSTRAINT PK_projects PRIMARY KEY (id),
        CONSTRAINT FK_projects_archived_by FOREIGN KEY (archived_by) REFERENCES users (id),
        CONSTRAINT FK_projects_created_by FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      `CREATE TABLE milestones (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_milestones_id DEFAULT NEWSEQUENTIALID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        code NVARCHAR(30) NOT NULL,
        name NVARCHAR(300) NOT NULL,
        description NVARCHAR(2000) NULL,
        sort_order INT NOT NULL CONSTRAINT DF_milestones_sort_order DEFAULT 0,
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_milestones_created_at DEFAULT ${utcNow},
        updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_milestones_updated_at DEFAULT ${utcNow},
        CONSTRAINT PK_milestones PRIMARY KEY (id),
        CONSTRAINT UQ_milestones_project_code UNIQUE (project_id, code),
        CONSTRAINT FK_milestones_project FOREIGN KEY (project_id) REFERENCES projects (id),
        CONSTRAINT FK_milestones_created_by FOREIGN KEY (created_by) REFERENCES users (id),
        CONSTRAINT FK_milestones_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
      )`,

      `CREATE TABLE tasks (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_tasks_id DEFAULT NEWSEQUENTIALID(),
        milestone_id UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(500) NOT NULL,
        responsible NVARCHAR(200) NULL,
        start_date DATE NOT NULL,
        estimated_date DATE NOT NULL,
        actual_date DATE NULL,
        is_completed BIT NOT NULL CONSTRAINT DF_tasks_is_completed DEFAULT 0,
        sort_order INT NOT NULL CONSTRAINT DF_tasks_sort_order DEFAULT 0,
        created_by UNIQUEIDENTIFIER NOT NULL,
        updated_by UNIQUEIDENTIFIER NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_tasks_created_at DEFAULT ${utcNow},
        updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_tasks_updated_at DEFAULT ${utcNow},
        CONSTRAINT PK_tasks PRIMARY KEY (id),
        CONSTRAINT FK_tasks_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id),
        CONSTRAINT FK_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id),
        CONSTRAINT FK_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
        CONSTRAINT CK_tasks_dates CHECK (estimated_date >= start_date),
        CONSTRAINT CK_tasks_completion CHECK (
          (is_completed = 1 AND actual_date IS NOT NULL) OR (is_completed = 0 AND actual_date IS NULL)
        )
      )`,

      `CREATE TABLE comments (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_comments_id DEFAULT NEWSEQUENTIALID(),
        milestone_id UNIQUEIDENTIFIER NULL,
        task_id UNIQUEIDENTIFIER NULL,
        author_id UNIQUEIDENTIFIER NOT NULL,
        body NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_comments_created_at DEFAULT ${utcNow},
        CONSTRAINT PK_comments PRIMARY KEY (id),
        CONSTRAINT FK_comments_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id),
        CONSTRAINT FK_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id),
        CONSTRAINT FK_comments_author FOREIGN KEY (author_id) REFERENCES users (id),
        CONSTRAINT CK_comments_parent CHECK (
          (milestone_id IS NOT NULL AND task_id IS NULL) OR (milestone_id IS NULL AND task_id IS NOT NULL)
        ),
        CONSTRAINT CK_comments_body CHECK (LEN(body) > 0)
      )`,

      `CREATE TABLE attachments (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_attachments_id DEFAULT NEWSEQUENTIALID(),
        comment_id UNIQUEIDENTIFIER NULL,
        task_id UNIQUEIDENTIFIER NULL,
        uploaded_by UNIQUEIDENTIFIER NOT NULL,
        file_name NVARCHAR(255) NOT NULL,
        content_type NVARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        storage_key NVARCHAR(500) NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_attachments_created_at DEFAULT ${utcNow},
        CONSTRAINT PK_attachments PRIMARY KEY (id),
        CONSTRAINT FK_attachments_comment FOREIGN KEY (comment_id) REFERENCES comments (id),
        CONSTRAINT FK_attachments_task FOREIGN KEY (task_id) REFERENCES tasks (id),
        CONSTRAINT FK_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id),
        CONSTRAINT CK_attachments_parent CHECK (
          (comment_id IS NOT NULL AND task_id IS NULL) OR (comment_id IS NULL AND task_id IS NOT NULL)
        ),
        CONSTRAINT CK_attachments_type CHECK (
          content_type IN ('image/png', 'image/jpeg', 'image/webp', 'application/pdf')
        ),
        CONSTRAINT CK_attachments_size CHECK (size_bytes > 0 AND size_bytes <= 5242880)
      )`,

      `CREATE TABLE audit_logs (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_audit_logs_id DEFAULT NEWSEQUENTIALID(),
        user_id UNIQUEIDENTIFIER NOT NULL,
        entity NVARCHAR(50) NOT NULL,
        entity_id UNIQUEIDENTIFIER NULL,
        action NVARCHAR(50) NOT NULL,
        changes_json NVARCHAR(MAX) NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT ${utcNow},
        CONSTRAINT PK_audit_logs PRIMARY KEY (id),
        CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      `CREATE INDEX IX_milestones_project ON milestones (project_id)`,
      `CREATE INDEX IX_tasks_milestone ON tasks (milestone_id)`,
      `CREATE INDEX IX_comments_milestone ON comments (milestone_id)`,
      `CREATE INDEX IX_comments_task ON comments (task_id)`,
      `CREATE INDEX IX_attachments_comment ON attachments (comment_id)`,
      `CREATE INDEX IX_attachments_task ON attachments (task_id)`,
      `CREATE INDEX IX_audit_logs_entity ON audit_logs (entity, entity_id)`,
      `CREATE INDEX IX_audit_logs_created_at ON audit_logs (created_at)`,
    ];

    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Children before parents. OBJECT_ID guards replace DROP TABLE IF EXISTS (SQL Server 2016+).
    const tables = ['audit_logs', 'attachments', 'comments', 'tasks', 'milestones', 'projects', 'users', 'permissions', 'roles'];
    for (const table of tables) {
      await queryRunner.query(`IF OBJECT_ID(N'dbo.${table}', N'U') IS NOT NULL DROP TABLE dbo.${table}`);
    }
  }
}
