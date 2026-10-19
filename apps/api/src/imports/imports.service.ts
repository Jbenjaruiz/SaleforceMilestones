import { BadRequestException, Injectable, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CoreAccessService } from '../core/core-access.service';
import { Milestone } from '../milestones/milestone.entity';
import { Task } from '../tasks/task.entity';
import { readWorkbook, ImportIssue } from './excel-reader';
import { buildPlan } from './import-validator';

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_REPORTED_ISSUES = 200;

export interface ImportReport {
  /** True when the file has no problems (and, unless dryRun, it was saved). */
  valid: boolean;
  dryRun: boolean;
  summary: { milestones: number; tasks: number };
  issues: ImportIssue[];
  totalIssues: number;
  truncated: boolean;
}

@Injectable()
export class ImportsService {
  constructor(
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    private readonly access: CoreAccessService,
    private readonly audit: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * All or nothing: every problem in the file is reported at once, and nothing is saved unless there are none.
   * With `dryRun` the file is only checked.
   */
  async importInto(projectId: string, file: Express.Multer.File | undefined, dryRun: boolean, actor: AuthenticatedUser): Promise<ImportReport> {
    const project = await this.access.project(projectId, actor, true);
    if (!file) throw new BadRequestException('Attach the Excel file in the "file" field.');
    if (file.size > IMPORT_MAX_BYTES) throw new PayloadTooLargeException('The file can be at most 5 MB.');
    if (!(file.buffer.length > 4 && file.buffer.subarray(0, 2).toString('latin1') === 'PK')) {
      throw new BadRequestException('The file must be an Excel workbook (.xlsx).');
    }

    const { rows, issues: readIssues } = await readWorkbook(file.buffer);
    const existing = await this.milestones.find({ select: { code: true }, where: { projectId } });
    const { plan, issues: ruleIssues } = readIssues.length > 0 ? { plan: { milestones: [] }, issues: [] } : buildPlan(rows, new Set(existing.map((m) => m.code)));

    const issues = [...readIssues, ...ruleIssues].sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
    const summary = { milestones: plan.milestones.length, tasks: plan.milestones.reduce((sum, m) => sum + m.tasks.length, 0) };
    const report: ImportReport = {
      valid: issues.length === 0,
      dryRun,
      summary,
      issues: issues.slice(0, MAX_REPORTED_ISSUES),
      totalIssues: issues.length,
      truncated: issues.length > MAX_REPORTED_ISSUES,
    };

    if (!report.valid) {
      if (dryRun) return report;
      throw new UnprocessableEntityException({ statusCode: 422, message: 'The file has errors. Nothing was imported; fix them and upload it again.', ...report });
    }
    if (dryRun) return report;

    await this.dataSource.transaction(async (manager) => {
      const milestoneRepository = manager.getRepository(Milestone);
      const taskRepository = manager.getRepository(Task);
      const { max } = (await milestoneRepository.createQueryBuilder('m').select('MAX(m.sortOrder)', 'max').where('m.projectId = :projectId', { projectId }).getRawOne()) as { max: number | null };

      let order = max ?? 0;
      for (const planned of plan.milestones) {
        const milestone = await milestoneRepository.save(
          milestoneRepository.create({ projectId, code: planned.code, name: planned.name, description: planned.description, sortOrder: (order += 1), createdBy: actor.id }),
        );
        await taskRepository.save(
          planned.tasks.map((task, index) =>
            taskRepository.create({
              milestoneId: milestone.id,
              name: task.name,
              responsible: task.responsible,
              startDate: task.startDate,
              estimatedDate: task.estimatedDate,
              actualDate: null,
              isCompleted: false,
              sortOrder: index + 1,
              createdBy: actor.id,
            }),
          ),
        );
      }
      await this.audit.record(
        { userId: actor.id, entity: 'project', entityId: projectId, action: 'import', changes: { project: project.name, fileName: file.originalname, ...summary, codes: plan.milestones.map((m) => m.code) } },
        manager,
      );
    });
    return report;
  }
}
