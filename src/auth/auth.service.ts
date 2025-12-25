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
