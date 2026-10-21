import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F02: assigns projects to users with per-project permissions.
 * Written for SQL Server 2012 (no DROP ... IF EXISTS). Foreign keys use NO ACTION: projects are archived, never deleted,
 * and users are deactivated, never deleted.
 */
export class AddProjectMembers1792605600000 implements MigrationInterface {
  name = 'AddProjectMembers1792605600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const statements = [
      `CREATE TABLE project_members (
        id UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_project_members_id DEFAULT NEWSEQUENTIALID(),
        project_id UNIQUEIDENTIFIER NOT NULL,
        user_id UNIQUEIDENTIFIER NOT NULL,
        can_create BIT NOT NULL CONSTRAINT DF_project_members_can_create DEFAULT 0,
        can_update BIT NOT NULL CONSTRAINT DF_project_members_can_update DEFAULT 0,
        can_delete BIT NOT NULL CONSTRAINT DF_project_members_can_delete DEFAULT 0,
        created_by UNIQUEIDENTIFIER NOT NULL,
        created_at DATETIME2(3) NOT NULL CONSTRAINT DF_project_members_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2(3) NOT NULL CONSTRAINT DF_project_members_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_project_members PRIMARY KEY (id),
        CONSTRAINT UQ_project_members_project_user UNIQUE (project_id, user_id),
        CONSTRAINT FK_project_members_project FOREIGN KEY (project_id) REFERENCES projects (id),
        CONSTRAINT FK_project_members_user FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT FK_project_members_created_by FOREIGN KEY (created_by) REFERENCES users (id)
      )`,
      `CREATE INDEX IX_project_members_user ON project_members (user_id)`,
    ];
    for (const statement of statements) {
      await queryRunner.query(statement);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`IF OBJECT_ID(N'dbo.project_members', N'U') IS NOT NULL DROP TABLE dbo.project_members`);
  }
}
