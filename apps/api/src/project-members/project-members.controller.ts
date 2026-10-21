import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { AdminOnly, CurrentUser } from '../auth/decorators';
import { ParseGuidPipe } from '../common/guid';
import { ReplaceAssignmentsDto } from './dto/assignment.dto';
import { ProjectMembersService } from './project-members.service';

/** Which projects a user can see, and what they may do in each. Only administrators manage this. */
@AdminOnly()
@Controller('users/:userId/projects')
export class ProjectMembersController {
  constructor(private readonly assignments: ProjectMembersService) {}

  @Get()
  list(@Param('userId', ParseGuidPipe) userId: string) {
    return this.assignments.list(userId);
  }

  /** Replaces all of the user's assignments with the list sent. */
  @Put()
  replace(@Param('userId', ParseGuidPipe) userId: string, @Body() dto: ReplaceAssignmentsDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.assignments.replace(userId, dto.assignments, actor);
  }
}
