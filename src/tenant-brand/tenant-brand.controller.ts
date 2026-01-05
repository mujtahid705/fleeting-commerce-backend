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
  UploadedFiles,
  ParseUUIDPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
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

  // Get current tenant's brand settings
  @Get()
  @UseGuards(JwtGuard)
  getBrand(@Req() req: any) {
    return this.tenantBrandService.getBrand(req);
  }

  // Get brand settings by tenant ID (public)
  @Get('tenant/:tenantId')
  getBrandByTenantId(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    return this.tenantBrandService.getBrandByTenantId(tenantId);
  }

  // Get brand settings by domain (public for storefront)
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

  // Create or update brand settings
  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'heroImage', maxCount: 1 },
        { name: 'exclusiveImages', maxCount: 20 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/brands',
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
        limits: { fileSize: 2 * 1024 * 1024 },
      },
    ),
  )
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  upsertBrand(
    @Body() createTenantBrandDto: CreateTenantBrandDto,
    @UploadedFiles() files: any,
    @Req() req: any,
  ) {
    return this.tenantBrandService.upsertBrand(
      createTenantBrandDto,
      files,
      req,
    );
  }

  // Update brand settings
  @Patch()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'heroImage', maxCount: 1 },
        { name: 'exclusiveImages', maxCount: 20 },
      ],
      {
        storage: diskStorage({
          destination: './uploads/brands',
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
        limits: { fileSize: 2 * 1024 * 1024 },
      },
    ),
  )
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateBrand(
    @Body() updateTenantBrandDto: UpdateTenantBrandDto,
    @UploadedFiles() files: any,
    @Req() req: any,
  ) {
    return this.tenantBrandService.updateBrand(
      updateTenantBrandDto,
      files,
      req,
    );
  }

  // Delete logo only
  @Delete('logo')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteLogo(@Req() req: any) {
    return this.tenantBrandService.deleteLogo(req);
  }

  // Delete all brand settings
  @Delete()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('TENANT_ADMIN')
  deleteBrand(@Req() req: any) {
    return this.tenantBrandService.deleteBrand(req);
  }
}
