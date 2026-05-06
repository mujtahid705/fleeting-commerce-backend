import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('reviews')
@UseGuards(JwtGuard, RolesGuard)
@Roles('TENANT_ADMIN')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  findAll(@Query() query: ListReviewsQueryDto, @Req() req: any) {
    return this.reviewsService.findAll(query, req);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    return this.reviewsService.findOne(id, req);
  }

  @Patch(':id/deactivate')
  deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    return this.reviewsService.setActive(id, req, false);
  }

  @Patch(':id/activate')
  activate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Req() req: any,
  ) {
    return this.reviewsService.setActive(id, req, true);
  }
}
