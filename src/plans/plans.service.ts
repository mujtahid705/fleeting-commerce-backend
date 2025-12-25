import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Get all active plans
  async findAll() {
    const plans = await this.databaseService.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
    return { message: 'Plans fetched successfully', data: plans };
  }

  // Get all plans (admin)
  async findAllAdmin() {
    const plans = await this.databaseService.plan.findMany({
      orderBy: { price: 'asc' },
    });
    return { message: 'Plans fetched successfully', data: plans };
  }

  // Get single plan
  async findOne(id: string) {
    const plan = await this.databaseService.plan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return { message: 'Plan fetched successfully', data: plan };
  }

  // Create plan
  async create(createPlanDto: CreatePlanDto) {
    const existing = await this.databaseService.plan.findUnique({
      where: { name: createPlanDto.name },
    });
    if (existing)
      throw new ConflictException('Plan with this name already exists');

    const plan = await this.databaseService.plan.create({
      data: {
        name: createPlanDto.name,
        price: createPlanDto.price,
        currency: createPlanDto.currency || 'BDT',
        interval: createPlanDto.interval,
        trialDays: createPlanDto.trialDays || 0,
        maxProducts: createPlanDto.maxProducts,
        maxCategories: createPlanDto.maxCategories,
        maxSubcategoriesPerCategory: createPlanDto.maxSubcategoriesPerCategory,
        maxOrders: createPlanDto.maxOrders,
        customDomain: createPlanDto.customDomain || false,
      },
    });
    return { message: 'Plan created successfully', data: plan };
  }

  // Update plan
  async update(id: string, updatePlanDto: UpdatePlanDto) {
    const existing = await this.databaseService.plan.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Plan not found');

    if (updatePlanDto.name && updatePlanDto.name !== existing.name) {
      const duplicate = await this.databaseService.plan.findUnique({
        where: { name: updatePlanDto.name },
      });
      if (duplicate)
        throw new ConflictException('Plan with this name already exists');
    }

    const plan = await this.databaseService.plan.update({
      where: { id },
      data: updatePlanDto,
    });
    return { message: 'Plan updated successfully', data: plan };
  }

  // Delete plan (soft delete by setting isActive to false)
  async delete(id: string) {
    const existing = await this.databaseService.plan.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Plan not found');

    // Check if any active subscriptions are using this plan
    const activeSubscriptions = await this.databaseService.subscription.count({
      where: {
        planId: id,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
    });

    if (activeSubscriptions > 0) {
      throw new ConflictException(
        `Cannot delete plan with ${activeSubscriptions} active subscription(s)`,
      );
    }

    const deletedPlan = await this.databaseService.plan.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Plan deleted successfully', data: deletedPlan };
  }

  // Seed default plans
  async seedDefaultPlans() {
    const existingPlans = await this.databaseService.plan.count();
    if (existingPlans > 0) {
      return { message: 'Plans already seeded', data: null };
    }

    const plans = [
      {
        name: 'Free Trial',
        price: 0,
        currency: 'BDT',
        interval: 'MONTHLY' as const,
        trialDays: 14,
        maxProducts: 20,
        maxCategories: 5,
        maxSubcategoriesPerCategory: 5,
        maxOrders: 50,
        customDomain: false,
      },
      {
        name: 'Starter',
        price: 999,
        currency: 'BDT',
        interval: 'MONTHLY' as const,
        trialDays: 0,
        maxProducts: 100,
        maxCategories: 20,
        maxSubcategoriesPerCategory: 10,
        maxOrders: 500,
        customDomain: false,
      },
      {
        name: 'Growth',
        price: 2499,
        currency: 'BDT',
        interval: 'MONTHLY' as const,
        trialDays: 0,
        maxProducts: 200,
        maxCategories: 50,
        maxSubcategoriesPerCategory: 25,
        maxOrders: 2000,
        customDomain: true,
      },
    ];

    await this.databaseService.plan.createMany({ data: plans });
    const seededPlans = await this.databaseService.plan.findMany({
      orderBy: { price: 'asc' },
    });
    return { message: 'Default plans seeded successfully', data: seededPlans };
  }
}
