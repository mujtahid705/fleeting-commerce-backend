import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';
import { SubcategoriesController } from './subcategories.controller';
import { SubcategoriesService } from './subcategories.service';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [SubcategoriesController],
  providers: [SubcategoriesService],
  exports: [SubcategoriesService],
})
export class SubcategoriesModule {}
