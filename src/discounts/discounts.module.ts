import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { DiscountsController } from './discounts.controller';
import { StorefrontDiscountsController } from './storefront-discounts.controller';
import { DiscountsService } from './discounts.service';

@Module({
  imports: [DatabaseModule],
  controllers: [DiscountsController, StorefrontDiscountsController],
  providers: [DiscountsService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
