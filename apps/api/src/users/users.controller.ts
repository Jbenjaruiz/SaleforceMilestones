import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { ParseGuidPipe } from '../common/guid';
import { AdminOnly, CurrentUser } from '../auth/decorators';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

/** Users are created and managed only by administrators; there is no self-registration. */
@AdminOnly()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Get(':id')
  get(@Param('id', ParseGuidPipe) id: string) {
    return this.users.get(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseGuidPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.update(id, dto, actor);
  }

  @HttpCode(204)
  @Post(':id/password')
  resetPassword(@Param('id', ParseGuidPipe) id: string, @Body() dto: ResetPasswordDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.resetPassword(id, dto.password, actor);
  }
}
