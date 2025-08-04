import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import * as bcrypt from 'bcrypt';
import { AuthLoginDto } from './dto/auth-login.dto';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';

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

    if (await bcrypt.compare(authLoginDto.password, user.password)) {
      const { password, ...data } = user;
      return data;
    }
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
  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser)
      throw new BadRequestException('Email has already been taken!');

    const user = await this.databaseService.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        phone: createUserDto.phone,
        isActive: true,
      },
    });

    const { password, ...data } = user;
    return data;
  }
}
