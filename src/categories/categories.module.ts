import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DatabaseModule } from 'src/database/database.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [DatabaseModule, CommonModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
