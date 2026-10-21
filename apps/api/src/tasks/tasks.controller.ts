import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { CurrentUser } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { CreateTaskDto, SetCompletionDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post('milestones/:milestoneId/tasks')
  create(@Param('milestoneId', ParseGuidPipe) milestoneId: string, @Body() dto: CreateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.create(milestoneId, dto, actor);
  }

  @Get('tasks/:id')
  get(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.get(id, actor);
  }

  @Patch('tasks/:id')
  update(@Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateTaskDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.update(id, dto, actor);
  }

  /** The check button: `{ "completed": true }` finishes the task, `false` reopens it. */
  @Put('tasks/:id/completion')
  setCompletion(@Param('id', ParseGuidPipe) id: string, @Body() dto: SetCompletionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.setCompletion(id, dto.completed, actor);
  }

  @HttpCode(204)
  @Delete('tasks/:id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.tasks.remove(id, actor);
  }
}
