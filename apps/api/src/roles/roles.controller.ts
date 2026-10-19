import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ParseGuidPipe } from '../common/guid';
import { AdminOnly, CurrentUser } from '../auth/decorators';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@AdminOnly()
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list() {
    return this.roles.list();
  }

  @Get(':id')
  get(@Param('id', ParseGuidPipe) id: string) {
    return this.roles.get(id);
  }

  @Post()
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.update(id, dto, actor);
  }

  @HttpCode(204)
  @Delete(':id')
  remove(@Param('id', ParseGuidPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.roles.remove(id, actor);
  }
}
