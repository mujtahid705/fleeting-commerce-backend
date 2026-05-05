import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { DatabaseModule } from 'src/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DiscountsModule } from 'src/discounts/discounts.module';

@Module({
  imports: [
    DatabaseModule,
    DiscountsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRY') || '30d',
        },
      }),
    }),
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule {}
