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
    const jwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(jwtPayload);
    return {
      token: token,
      user: user,
    };
  }

  // Register new user
  // async register(createUserDto: CreateUserDto) {
  //   const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
  //   const existingUser = await this.databaseService.user.findUnique({
  //     where: { email: createUserDto.email },
  //   });

  //   if (existingUser)
  //     throw new BadRequestException('Email has already been taken!');

  //   const user = await this.databaseService.user.create({
  //     data: {
  //       name: createUserDto.name,
  //       email: createUserDto.email,
  //       password: hashedPassword,
  //       phone: createUserDto.phone,
  //       isActive: true,
  //     },
  //   });

  //   const { password, ...data } = user;
  //   return data;
  // }

  // Create customer user
  async createCustomer(createCustomerDto: CreateCustomerDto) {
    const hashedPassword = await bcrypt.hash(createCustomerDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createCustomerDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

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
    return data;
  }

  // Create tenant admin user
  async createTenantAdmin(createTenantAdminDto: CreateTenantAdminDto) {
    const hashedPassword = await bcrypt.hash(createTenantAdminDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createTenantAdminDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

    const user = await this.databaseService.user.create({
      data: {
        name: createTenantAdminDto.name,
        email: createTenantAdminDto.email,
        password: hashedPassword,
        phone: createTenantAdminDto.phone,
        isActive: true,
        tenantId: createTenantAdminDto.tenantId,
        role: 'TENANT_ADMIN',
      },
    });

    const { password, ...data } = user;
    return data;
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
    return data;
  }
}
