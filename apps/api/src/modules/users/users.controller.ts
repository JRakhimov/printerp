import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { CreateUserDto, CreateUserSchema, UpdateUserDto, UpdateUserSchema } from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Req() req: any) {
    return this.usersService.getUserById(req.user.id);
  }

  @Get('users')
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('users')
  async create(@Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch('users/:id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, dto);
  }

  @Delete('users/:id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.deleteUser(id);
  }
}
