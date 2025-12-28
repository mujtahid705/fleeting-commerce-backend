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
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  private readonly GRACE_PERIOD_DAYS = 7;

  // OTP Configuration
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly OTP_RESEND_COOLDOWN_SECONDS = 60;
  private readonly MAX_OTP_REQUESTS_PER_HOUR = 3;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // Generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

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

  // ========== OTP-BASED REGISTRATION METHODS ==========

  // Initiate registration - send OTP to email
  async initiateRegistration(email: string) {
    // Check if email already exists in users table
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email has already been taken!');
    }

    // Check for rate limiting - max 3 OTP requests per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtpCount = await this.databaseService.emailOtp.count({
      where: {
        email,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentOtpCount >= this.MAX_OTP_REQUESTS_PER_HOUR) {
      throw new BadRequestException(
        'Too many OTP requests. Please try again after an hour.',
      );
    }

    // Check cooldown - prevent spam (must wait 60 seconds between requests)
    const lastOtp = await this.databaseService.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (lastOtp) {
      const cooldownEnd = new Date(
        lastOtp.createdAt.getTime() + this.OTP_RESEND_COOLDOWN_SECONDS * 1000,
      );
      if (new Date() < cooldownEnd) {
        const remainingSeconds = Math.ceil(
          (cooldownEnd.getTime() - Date.now()) / 1000,
        );
        throw new BadRequestException(
          `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
        );
      }
    }

    // Generate new OTP
    const otp = this.generateOtp();
    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    // Delete any existing OTPs for this email
    await this.databaseService.emailOtp.deleteMany({
      where: { email },
    });

    // Save new OTP
    await this.databaseService.emailOtp.create({
      data: {
        email,
        otp,
        expiresAt,
      },
    });

    // Send OTP email
    const emailSent = await this.mailService.sendOtpEmail(email, otp);

    if (!emailSent) {
      throw new BadRequestException(
        'Failed to send OTP email. Please try again.',
      );
    }

    return {
      message: 'OTP sent successfully to your email',
      data: {
        email,
        expiresIn: `${this.OTP_EXPIRY_MINUTES} minutes`,
      },
    };
  }

  // Verify OTP and complete registration
  async verifyOtpAndRegister(
    email: string,
    otp: string,
    name: string,
    password: string,
    phone: string,
    tenantName: string,
  ) {
    // Find the OTP record
    const otpRecord = await this.databaseService.emailOtp.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException(
        'No OTP found for this email. Please request a new OTP.',
      );
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await this.databaseService.emailOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    // Check max attempts
    if (otpRecord.attempts >= this.MAX_OTP_ATTEMPTS) {
      await this.databaseService.emailOtp.delete({
        where: { id: otpRecord.id },
      });
      throw new BadRequestException(
        'Maximum OTP attempts exceeded. Please request a new OTP.',
      );
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      // Increment attempts
      await this.databaseService.emailOtp.update({
        where: { id: otpRecord.id },
        data: {
          attempts: otpRecord.attempts + 1,
          lastAttemptAt: new Date(),
        },
      });

      const remainingAttempts = this.MAX_OTP_ATTEMPTS - otpRecord.attempts - 1;
      throw new BadRequestException(
        `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      );
    }

    // OTP is valid - check if email is still available
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email has already been taken!');
    }

    // Create tenant and user
    const hashedPassword = await bcrypt.hash(password, 10);

    const tenant = await this.databaseService.tenant.create({
      data: {
        name: tenantName,
      },
    });

    const user = await this.databaseService.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        tenantId: tenant.id,
        isActive: true,
        role: 'TENANT_ADMIN',
      },
    });

    // Delete the OTP record
    await this.databaseService.emailOtp.delete({
      where: { id: otpRecord.id },
    });

    const { password: _, ...userData } = user;
    return {
      message: 'Registration completed successfully',
      data: {
        user: userData,
        tenant,
      },
    };
  }

  // Resend OTP
  async resendOtp(email: string) {
    return this.initiateRegistration(email);
  }
}
