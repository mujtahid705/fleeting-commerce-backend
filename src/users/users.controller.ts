import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { JwtPayload } from 'src/auth/types/jwt-payload.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // get all users
  @Get('all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getAllUsers(@Req() req: Request & { user: JwtPayload }) {
    return this.usersService.findAll();
  }
}
