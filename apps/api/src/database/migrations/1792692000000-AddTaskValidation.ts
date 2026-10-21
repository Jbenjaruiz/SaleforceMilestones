import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F03: lets a task be marked as ready for the client to validate.
 * Written for SQL Server 2012. Existing tasks start unmarked.
 */
export class AddTaskValidation1792692000000 implements MigrationInterface {
  name = 'AddTaskValidation1792692000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tasks ADD ready_for_validation BIT NOT NULL CONSTRAINT DF_tasks_ready_for_validation DEFAULT 0`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE tasks DROP CONSTRAINT DF_tasks_ready_for_validation`);
    await queryRunner.query(`ALTER TABLE tasks DROP COLUMN ready_for_validation`);
  }
}
