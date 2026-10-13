import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  CreateUserSchema,
  Role,
  UpdateUserDto,
  UpdateUserSchema,
} from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getUserById(userId);
  }

  @Get('users')
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('users')
  @Roles(Role.OWNER)
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch('users/:id')
  @Roles(Role.OWNER)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @Roles(Role.OWNER)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.deleteUser(id);
  }
}
