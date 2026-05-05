import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const { memoryStorage } = require('multer');
const { v2: cloudinary } = require('cloudinary');

interface UploadApiResponse {
  public_id: string;
  secure_url: string;
}

export type CloudinaryImageVariant =
  | 'product'
  | 'brand-logo'
  | 'brand-hero'
  | 'brand-exclusive';

export interface UploadedCloudinaryImage {
  secureUrl: string;
  optimizedUrl: string;
  publicId: string;
}

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
}

@Injectable()
export class FileUploadService {
  private readonly rootFolder: string;

  constructor(private readonly configService: ConfigService) {
    this.rootFolder =
      this.configService.get<string>('CLOUDINARY_ROOT_FOLDER') ||
      'fleeting-commerce';

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  static createMulterConfig(options?: {
    allowedSvg?: boolean;
    fileSize?: number;
  }): MulterOptions {
    const allowedSvg = options?.allowedSvg ?? false;
    const fileSize = options?.fileSize ?? 5 * 1024 * 1024;

    return {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const imagePattern = allowedSvg
          ? /\/(jpg|jpeg|png|gif|webp|svg\+xml)$/
          : /\/(jpg|jpeg|png|gif|webp)$/;

        if (file.mimetype.match(imagePattern)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed!'), false);
        }
      },
      limits: { fileSize },
    };
  }

  getMulterConfig(options?: {
    allowedSvg?: boolean;
    fileSize?: number;
  }): MulterOptions {
    return FileUploadService.createMulterConfig(options);
  }

  getProductFolder(tenantId: string, productId: string): string {
    return `${this.rootFolder}/tenants/${tenantId}/products/${productId}`;
  }

  getBrandFolder(tenantId: string): string {
    return `${this.rootFolder}/tenants/${tenantId}/brand`;
  }

  async uploadImage(
    file: UploadedImageFile,
    folder: string,
    variant: CloudinaryImageVariant,
  ): Promise<UploadedCloudinaryImage> {
    this.assertConfigured();

    if (!file?.buffer?.length) {
      throw new BadRequestException('Uploaded image is empty or invalid');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          unique_filename: true,
          use_filename: false,
          overwrite: false,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error || new Error('Cloudinary upload failed'));
            return;
          }
          resolve(uploadResult);
        },
      );

      stream.end(file.buffer);
    });

    return {
      secureUrl: result.secure_url,
      optimizedUrl: this.buildOptimizedUrl(result.public_id, variant),
      publicId: result.public_id,
    };
  }

  async uploadImages(
    files: UploadedImageFile[] | undefined,
    folder: string,
    variant: CloudinaryImageVariant,
  ): Promise<UploadedCloudinaryImage[]> {
    if (!files?.length) return [];

    const uploaded: UploadedCloudinaryImage[] = [];
    try {
      for (const file of files) {
        uploaded.push(await this.uploadImage(file, folder, variant));
      }
      return uploaded;
    } catch (error) {
      await this.deleteImages(uploaded.map((image) => image.publicId));
      throw error;
    }
  }

  buildOptimizedUrl(publicId: string, variant: CloudinaryImageVariant): string {
    const widthByVariant: Record<CloudinaryImageVariant, number> = {
      product: 1600,
      'brand-logo': 600,
      'brand-hero': 2400,
      'brand-exclusive': 1200,
    };

    return cloudinary.url(publicId, {
      secure: true,
      resource_type: 'image',
      transformation: [
        {
          fetch_format: 'auto',
          quality: 'auto',
          crop: 'limit',
          width: widthByVariant[variant],
        },
      ],
    });
  }

  async deleteImage(publicId?: string | null): Promise<void> {
    if (!publicId) return;

    try {
      this.assertConfigured();
      await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: 'image',
      });
    } catch (error) {
      console.error(`Failed to delete Cloudinary image ${publicId}:`, error);
    }
  }

  async deleteImages(publicIds: Array<string | null | undefined>): Promise<void> {
    await Promise.all(publicIds.map((publicId) => this.deleteImage(publicId)));
  }

  private assertConfigured() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new InternalServerErrorException(
        'Cloudinary credentials are not configured',
      );
    }
  }
}
