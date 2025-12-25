import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Get all active plans (public)
  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  // Get all plans including inactive (admin)
  @Get('admin/all')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  findAllAdmin() {
    return this.plansService.findAllAdmin();
  }

  // Get single plan
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.plansService.findOne(id);
  }

  // Create plan (admin only)
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  // Update plan (admin only)
  @Patch(':id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlanDto: UpdatePlanDto,
  ) {
    return this.plansService.update(id, updatePlanDto);
  }

  // Seed default plans (admin only)
  @Post('seed')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  seedPlans() {
    return this.plansService.seedDefaultPlans();
  }
}
