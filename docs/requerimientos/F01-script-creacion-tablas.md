# F01 — Script de creación de tablas (SQL Server 2012)

Script para que quien administre la base **`fw_project`** cree el esquema de [F01](F01-base-de-datos-y-backend.md) sin esperar a que el usuario de la aplicación tenga permisos de DDL. Es equivalente a la migración `apps/api/src/database/migrations/1792432800000-InitialSchema.ts` (generado a partir de ella).

- **Compatibilidad:** SQL Server 2012 SP4. No usa `DROP … IF EXISTS`, JSON ni `STRING_AGG`. El analizador del servidor lo validó (`SET PARSEONLY ON`) sin errores de sintaxis.
- **Permisos necesarios para ejecutarlo:** `CREATE TABLE` y `REFERENCES` en la base (por ejemplo `db_ddladmin`), o `db_owner`.
- **Esquema:** `dbo`. Ejecutar con la base `fw_project` seleccionada.
- **Orden:** el script respeta las dependencias; ejecutarlo completo, de arriba abajo.
- Las claves foráneas son `NO ACTION` salvo `permissions → roles` (`CASCADE`): los borrados en orden los hace la aplicación en una transacción.

## 1. Crear tablas e índices

```sql
USE fw_project;
GO

CREATE TABLE roles (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_roles_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    is_protected BIT NOT NULL CONSTRAINT DF_roles_is_protected DEFAULT 0,
    CONSTRAINT PK_roles PRIMARY KEY (id),
    CONSTRAINT UQ_roles_name UNIQUE (name)
);
GO

CREATE TABLE permissions (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_permissions_id DEFAULT NEWSEQUENTIALID(),
    role_id UNIQUEIDENTIFIER NOT NULL,
    code NVARCHAR(20) NOT NULL,
    CONSTRAINT PK_permissions PRIMARY KEY (id),
    CONSTRAINT UQ_permissions_role_code UNIQUE (role_id, code),
    CONSTRAINT CK_permissions_code CHECK (code IN ('read', 'create', 'update', 'delete')),
    CONSTRAINT FK_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);
GO

CREATE TABLE users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_users_id DEFAULT NEWSEQUENTIALID(),
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL CONSTRAINT DF_users_is_active DEFAULT 1,
    role_id UNIQUEIDENTIFIER NOT NULL,
    last_login_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_users PRIMARY KEY (id),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT FK_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
);
GO

CREATE TABLE projects (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_projects_id DEFAULT NEWSEQUENTIALID(),
    name NVARCHAR(200) NOT NULL,
    description NVARCHAR(1000) NULL,
    is_archived BIT NOT NULL CONSTRAINT DF_projects_is_archived DEFAULT 0,
    archived_at DATETIME2(3) NULL,
    archived_by UNIQUEIDENTIFIER NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_projects_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_projects PRIMARY KEY (id),
    CONSTRAINT FK_projects_archived_by FOREIGN KEY (archived_by) REFERENCES users (id),
    CONSTRAINT FK_projects_created_by FOREIGN KEY (created_by) REFERENCES users (id)
);
GO

CREATE TABLE milestones (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_milestones_id DEFAULT NEWSEQUENTIALID(),
    project_id UNIQUEIDENTIFIER NOT NULL,
    code NVARCHAR(30) NOT NULL,
    name NVARCHAR(300) NOT NULL,
    description NVARCHAR(2000) NULL,
    sort_order INT NOT NULL CONSTRAINT DF_milestones_sort_order DEFAULT 0,
    created_by UNIQUEIDENTIFIER NOT NULL,
    updated_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_milestones_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_milestones_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_milestones PRIMARY KEY (id),
    CONSTRAINT UQ_milestones_project_code UNIQUE (project_id, code),
    CONSTRAINT FK_milestones_project FOREIGN KEY (project_id) REFERENCES projects (id),
    CONSTRAINT FK_milestones_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT FK_milestones_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);
GO

CREATE TABLE tasks (
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
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_tasks_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_tasks_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_tasks PRIMARY KEY (id),
    CONSTRAINT FK_tasks_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id),
    CONSTRAINT FK_tasks_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT FK_tasks_updated_by FOREIGN KEY (updated_by) REFERENCES users (id),
    CONSTRAINT CK_tasks_dates CHECK (estimated_date >= start_date),
    CONSTRAINT CK_tasks_completion CHECK (
      (is_completed = 1 AND actual_date IS NOT NULL) OR (is_completed = 0 AND actual_date IS NULL)
    )
);
GO

CREATE TABLE comments (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_comments_id DEFAULT NEWSEQUENTIALID(),
    milestone_id UNIQUEIDENTIFIER NULL,
    task_id UNIQUEIDENTIFIER NULL,
    author_id UNIQUEIDENTIFIER NOT NULL,
    body NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_comments_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_comments PRIMARY KEY (id),
    CONSTRAINT FK_comments_milestone FOREIGN KEY (milestone_id) REFERENCES milestones (id),
    CONSTRAINT FK_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id),
    CONSTRAINT FK_comments_author FOREIGN KEY (author_id) REFERENCES users (id),
    CONSTRAINT CK_comments_parent CHECK (
      (milestone_id IS NOT NULL AND task_id IS NULL) OR (milestone_id IS NULL AND task_id IS NOT NULL)
    ),
    CONSTRAINT CK_comments_body CHECK (LEN(body) > 0)
);
GO

CREATE TABLE attachments (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_attachments_id DEFAULT NEWSEQUENTIALID(),
    comment_id UNIQUEIDENTIFIER NULL,
    task_id UNIQUEIDENTIFIER NULL,
    uploaded_by UNIQUEIDENTIFIER NOT NULL,
    file_name NVARCHAR(255) NOT NULL,
    content_type NVARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key NVARCHAR(500) NOT NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_attachments_created_at DEFAULT SYSUTCDATETIME(),
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
);
GO

CREATE TABLE audit_logs (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_audit_logs_id DEFAULT NEWSEQUENTIALID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    entity NVARCHAR(50) NOT NULL,
    entity_id UNIQUEIDENTIFIER NULL,
    action NVARCHAR(50) NOT NULL,
    changes_json NVARCHAR(MAX) NULL,
    created_at DATETIME2(3) NOT NULL CONSTRAINT DF_audit_logs_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_audit_logs PRIMARY KEY (id),
    CONSTRAINT FK_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id)
);
GO

CREATE INDEX IX_users_role ON users (role_id);
CREATE INDEX IX_milestones_project ON milestones (project_id);
CREATE INDEX IX_tasks_milestone ON tasks (milestone_id);
CREATE INDEX IX_comments_milestone ON comments (milestone_id);
CREATE INDEX IX_comments_task ON comments (task_id);
CREATE INDEX IX_attachments_comment ON attachments (comment_id);
CREATE INDEX IX_attachments_task ON attachments (task_id);
CREATE INDEX IX_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX IX_audit_logs_created_at ON audit_logs (created_at);
GO
```

## 2. Datos iniciales de roles y permisos

Crea los roles **Administrator** (protegido, con las cuatro acciones) y **Reviewer** (solo lectura). Es repetible: no duplica filas.

```sql
USE fw_project;
GO

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = N'Administrator')
  INSERT INTO roles (name, description, is_protected)
  VALUES (N'Administrator', N'Full access, including users, roles, projects and imports.', 1);

IF NOT EXISTS (SELECT 1 FROM roles WHERE name = N'Reviewer')
  INSERT INTO roles (name, description, is_protected)
  VALUES (N'Reviewer', N'Read-only access.', 0);

INSERT INTO permissions (role_id, code)
SELECT r.id, c.code
FROM roles r
JOIN (VALUES (N'Administrator', N'read'), (N'Administrator', N'create'), (N'Administrator', N'update'),
             (N'Administrator', N'delete'), (N'Reviewer', N'read')) AS c (role_name, code)
  ON c.role_name = r.name
WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.role_id = r.id AND p.code = c.code);
GO
```

> El **usuario administrador** no se crea aquí: su contraseña debe guardarse como hash. Lo crea `npm run seed -w @seguimiento/api` con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`.

## 3. Registrar la migración (solo si el script se ejecutó a mano)

La aplicación lleva el control de migraciones en la tabla `migrations`. Si el esquema se creó con este script, hay que registrar la migración para que `npm run migration:run` **no intente crearlo de nuevo**:

```sql
USE fw_project;
GO

IF OBJECT_ID(N'dbo.migrations', N'U') IS NULL
  CREATE TABLE migrations (
    id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_migrations PRIMARY KEY,
    [timestamp] BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL
);

IF NOT EXISTS (SELECT 1 FROM migrations WHERE [timestamp] = 1792432800000)
  INSERT INTO migrations ([timestamp], name) VALUES (1792432800000, 'InitialSchema1792432800000');
GO
```

## 4. Verificación

```sql
SELECT name FROM sys.tables ORDER BY name;          -- 9 tablas + migrations (si se registró)
SELECT r.name AS role, p.code FROM roles r JOIN permissions p ON p.role_id = r.id ORDER BY r.name, p.code;
```

Tablas esperadas: `attachments`, `audit_logs`, `comments`, `milestones`, `permissions`, `projects`, `roles`, `tasks`, `users`.

## 5. Reversión (solo en una base de pruebas)

**Borra todos los datos.** Elimina las tablas en orden inverso a las dependencias:

```sql
USE fw_project;
GO

IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NOT NULL DROP TABLE dbo.audit_logs;
IF OBJECT_ID(N'dbo.attachments', N'U') IS NOT NULL DROP TABLE dbo.attachments;
IF OBJECT_ID(N'dbo.comments', N'U') IS NOT NULL DROP TABLE dbo.comments;
IF OBJECT_ID(N'dbo.tasks', N'U') IS NOT NULL DROP TABLE dbo.tasks;
IF OBJECT_ID(N'dbo.milestones', N'U') IS NOT NULL DROP TABLE dbo.milestones;
IF OBJECT_ID(N'dbo.projects', N'U') IS NOT NULL DROP TABLE dbo.projects;
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID(N'dbo.permissions', N'U') IS NOT NULL DROP TABLE dbo.permissions;
IF OBJECT_ID(N'dbo.roles', N'U') IS NOT NULL DROP TABLE dbo.roles;
-- Si se registró la migración a mano:
IF OBJECT_ID(N'dbo.migrations', N'U') IS NOT NULL DELETE FROM migrations WHERE [timestamp] = 1792432800000;
GO
```
