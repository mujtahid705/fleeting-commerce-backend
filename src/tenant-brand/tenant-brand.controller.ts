import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TenantBrandService } from './tenant-brand.service';
import { CreateTenantBrandDto, UpdateTenantBrandDto } from './dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('tenant-brand')
export class TenantBrandController {
  constructor(private readonly tenantBrandService: TenantBrandService) {}

  /**
   * Get current tenant's brand settings (requires authentication)
   * GET /api/tenant-brand
   */
  @Get()
  @UseGuards(JwtGuard)
  getBrand(@Req() req: any) {
    return this.tenantBrandService.getBrand(req);
  }

  /**
   * Get brand settings by tenant ID (public endpoint)
   * GET /api/tenant-brand/tenant/:tenantId
   */
  @Get('tenant/:tenantId')
  getBrandByTenantId(
    @Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
  ) {
    return this.tenantBrandService.getBrandByTenantId(tenantId);
  }

  /**
   * Get brand settings by domain (public endpoint for storefront)
   * GET /api/tenant-brand/domain?domain=example.com
   */
  @Get('domain')
  getBrandByDomain(@Query('domain') domain: string) {
    return this.tenantBrandService.getBrandByDomain(domain);
  }

  // Check domain availability
  @Get('check-unique-domain')
  @UseGuards(JwtGuard)
  checkUniqueDomain(@Query('domain') domain: string, @Req() req: any) {
    return this.tenantBrandService.checkUniqueDomain(domain, req.user.tenantId);
  }

  /**
   * Create or update brand settings (upsert)
   * POST /api/tenant-brand
   */
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, './uploads/brands');
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit for logo
      },
    }),
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  upsertBrand(
    @Body() createTenantBrandDto: CreateTenantBrandDto,
    @UploadedFile() logo: any,
    @Req() req: any,
  ) {
    return this.tenantBrandService.upsertBrand(createTenantBrandDto, logo, req);
  }

  /**
   * Update brand settings
   * PATCH /api/tenant-brand
   */
  @Patch()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          cb(null, './uploads/brands');
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
      limits: {
        fileSize: 2 * 1024 * 1024, // 2MB limit for logo
      },
    }),
  )
  @UsePipes(new ValidationPipe({ transform: true }))
  updateBrand(
    @Body() updateTenantBrandDto: UpdateTenantBrandDto,
    @UploadedFile() logo: any,
    @Req() req: any,
  ) {
    return this.tenantBrandService.updateBrand(updateTenantBrandDto, logo, req);
  }

  /**
   * Delete logo only
   * DELETE /api/tenant-brand/logo
   */
  @Delete('logo')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteLogo(@Req() req: any) {
    return this.tenantBrandService.deleteLogo(req);
  }

  /**
   * Delete all brand settings
   * DELETE /api/tenant-brand
   */
  @Delete()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteBrand(@Req() req: any) {
    return this.tenantBrandService.deleteBrand(req);
  }
}
