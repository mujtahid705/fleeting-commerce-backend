import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtService } from '@nestjs/jwt';
import {
  CreateCustomerDto,
  CreateSuperAdminDto,
  CreateTenantAdminDto,
  CreateTenantAdminWithTenantDto,
} from './dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly GRACE_PERIOD_DAYS = 7;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // Validate user credentials
  async validateUser(authLoginDto: AuthLoginDto): Promise<any> {
    const user = await this.databaseService.user.findUnique({
      where: { email: authLoginDto.email },
    });

    if (!user) throw new NotFoundException('User not found!');

    const isPasswordValid = await bcrypt.compare(
      authLoginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    const { password, ...data } = user;
    return data;
  }

  // Login user and return JWT token
  async login(user: any): Promise<{ token: string; user: any }> {
    const jwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    };
    const token = this.jwtService.sign(jwtPayload);
    return {
      token: token,
      user: user,
    };
  }

  // Validate session and return comprehensive user data
  async validateSession(userId: string, tenantId: string, role: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is deactivated');
    }

    // For SUPER_ADMIN, return basic info without subscription
    if (role === 'SUPER_ADMIN') {
      return {
        message: 'Session validated successfully',
        data: {
          user,
          tenant: null,
          subscription: null,
          access: {
            hasAccess: true,
            canCreate: true,
            canUpdate: true,
            canDelete: true,
            isInGracePeriod: false,
            gracePeriodDaysRemaining: 0,
          },
          usage: null,
          unreadNotifications: 0,
        },
      };
    }

    // Get tenant info
    const tenant = tenantId
      ? await this.databaseService.tenant.findUnique({
          where: { id: tenantId },
          select: {
            id: true,
            name: true,
            hasUsedTrial: true,
            createdAt: true,
          },
        })
      : null;

    // Get subscription info
    const subscription = tenantId
      ? await this.databaseService.subscription.findUnique({
          where: { tenantId },
          include: { plan: true },
        })
      : null;

    // Calculate access status
    let access = {
      hasAccess: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      isInGracePeriod: false,
      gracePeriodDaysRemaining: 0,
      daysRemaining: 0,
      message: 'No subscription found',
    };

    if (subscription) {
      const status = this.getSubscriptionStatus(subscription);
      access = {
        hasAccess: status.hasAccess,
        canCreate: status.canCreate,
        canUpdate: status.canUpdate,
        canDelete: status.canDelete,
        isInGracePeriod: status.isInGracePeriod,
        gracePeriodDaysRemaining: status.gracePeriodDaysRemaining,
        daysRemaining: status.daysRemaining,
        message: status.message,
      };
    }

    // Get usage stats for TENANT_ADMIN
    let usage: any = null;
    if (role === 'TENANT_ADMIN' && tenantId && subscription) {
      const [productCount, categoryCount] = await Promise.all([
        this.databaseService.product.count({ where: { tenantId } }),
        this.databaseService.category.count({ where: { tenantId } }),
      ]);

      const categories = await this.databaseService.category.findMany({
        where: { tenantId },
        include: { _count: { select: { subCategories: true } } },
      });

      const maxSubcategoriesUsed = categories.reduce(
        (max, cat) => Math.max(max, cat._count.subCategories),
        0,
      );

      usage = {
        products: {
          used: productCount,
          limit: subscription.plan.maxProducts,
          remaining: Math.max(0, subscription.plan.maxProducts - productCount),
        },
        categories: {
          used: categoryCount,
          limit: subscription.plan.maxCategories,
          remaining: Math.max(
            0,
            subscription.plan.maxCategories - categoryCount,
          ),
        },
        subcategoriesPerCategory: {
          maxUsed: maxSubcategoriesUsed,
          limit: subscription.plan.maxSubcategoriesPerCategory,
        },
      };
    }

    // Get unread notification count
    const unreadNotifications = tenantId
      ? await this.databaseService.notification.count({
          where: { tenantId, isRead: false },
        })
      : 0;

    return {
      message: 'Session validated successfully',
      data: {
        user,
        tenant,
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              startDate: subscription.startDate,
              endDate: subscription.endDate,
              trialEndsAt: subscription.trialEndsAt,
              plan: subscription.plan,
            }
          : null,
        access,
        usage,
        unreadNotifications,
      },
    };
  }

  // Helper: Calculate subscription status
  private getSubscriptionStatus(subscription: any): {
    hasAccess: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    isInGracePeriod: boolean;
    gracePeriodDaysRemaining: number;
    daysRemaining: number;
    message: string;
  } {
    const now = new Date();
    const endDate = subscription.endDate
      ? new Date(subscription.endDate)
      : subscription.trialEndsAt
        ? new Date(subscription.trialEndsAt)
        : null;

    if (!endDate) {
      return {
        hasAccess: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        isInGracePeriod: false,
        gracePeriodDaysRemaining: 0,
        daysRemaining: 0,
        message: 'Subscription active',
      };
    }

    const diffTime = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Active subscription
    if (daysRemaining > 0) {
      return {
        hasAccess: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        isInGracePeriod: false,
        gracePeriodDaysRemaining: 0,
        daysRemaining,
        message: `Subscription active. ${daysRemaining} day(s) remaining.`,
      };
    }

    // Grace period
    const daysSinceExpiry = Math.abs(daysRemaining);
    if (daysSinceExpiry <= this.GRACE_PERIOD_DAYS) {
      const graceDaysLeft = this.GRACE_PERIOD_DAYS - daysSinceExpiry;
      return {
        hasAccess: true,
        canCreate: false,
        canUpdate: false,
        canDelete: true,
        isInGracePeriod: true,
        gracePeriodDaysRemaining: graceDaysLeft,
        daysRemaining: 0,
        message: `Subscription expired. ${graceDaysLeft} day(s) left to renew.`,
      };
    }

    // Fully expired
    return {
      hasAccess: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      isInGracePeriod: false,
      gracePeriodDaysRemaining: 0,
      daysRemaining: 0,
      message: 'Subscription expired. Please renew to regain access.',
    };
  }

  // Create customer user
  async createCustomer(createCustomerDto: CreateCustomerDto) {
    const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createCustomerDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');
    console.log(createCustomerDto);

    const user = await this.databaseService.user.create({
      data: {
        name: createCustomerDto.name,
        email: createCustomerDto.email,
        password: hashedPassword,
        phone: createCustomerDto.phone,
        isActive: true,
        tenantId: createCustomerDto.tenantId,
        role: 'CUSTOMER',
      },
    });

    const { password, ...data } = user;
    return { message: 'Customer created successfully', data };
  }

  // Create tenant admin user
  async createTenantAdmin(createTenantAdminDto: CreateTenantAdminDto) {
    const hashedPassword = await bcrypt.hash(createTenantAdminDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createTenantAdminDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: createTenantAdminDto.tenantId },
    });

    if (!tenant) throw new NotFoundException('Tenant not found!');

    const user = await this.databaseService.user.create({
      data: {
        name: createTenantAdminDto.name,
        email: createTenantAdminDto.email,
        password: hashedPassword,
        phone: createTenantAdminDto.phone,
        tenantId: createTenantAdminDto.tenantId,
        isActive: true,
        role: 'TENANT_ADMIN',
      },
    });

    const { password, ...data } = user;
    return { message: 'Tenant admin created successfully', data };
  }

  // Create tenant admin with new tenant
  async createTenantAdminWithTenant(
    createTenantAdminWithTenant: CreateTenantAdminWithTenantDto,
  ) {
    const hashedPassword = await bcrypt.hash(
      createTenantAdminWithTenant.password,
      10,
    );
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createTenantAdminWithTenant.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

    // Create new tenant
    const tenant = await this.databaseService.tenant.create({
      data: {
        name: createTenantAdminWithTenant.tenantName,
      },
    });

    // Create tenant admin user
    const user = await this.databaseService.user.create({
      data: {
        name: createTenantAdminWithTenant.name,
        email: createTenantAdminWithTenant.email,
        password: hashedPassword,
        phone: createTenantAdminWithTenant.phone,
        tenantId: tenant.id,
        isActive: true,
        role: 'TENANT_ADMIN',
      },
    });

    const { password, ...data } = user;
    return { message: 'Tenant admin with tenant created successfully', data };
  }

  // Create super admin user
  async createSuperAdmin(createSuperAdminDto: CreateSuperAdminDto) {
    const hashedPassword = await bcrypt.hash(createSuperAdminDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createSuperAdminDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

    const user = await this.databaseService.user.create({
      data: {
        name: createSuperAdminDto.name,
        email: createSuperAdminDto.email,
        password: hashedPassword,
        phone: createSuperAdminDto.phone,
        isActive: true,
        role: 'SUPER_ADMIN',
        tenantId: null,
      },
    });

    const { password, ...data } = user;
    return { message: 'Super admin created successfully', data };
  }
}
