import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { SubcategoriesModule } from './subcategories/subcategories.module';
import { OrdersModule } from './orders/orders.module';
import { TenantsModule } from './tenants/tenants.module';
import { InventoryModule } from './inventory/inventory.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { MailModule } from './mail/mail.module';
import { TenantBrandModule } from './tenant-brand/tenant-brand.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    MailModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    SubcategoriesModule,
    OrdersModule,
    TenantsModule,
    TenantBrandModule,
    InventoryModule,
    PlansModule,
    SubscriptionsModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
