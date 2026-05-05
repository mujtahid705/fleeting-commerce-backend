import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileUploadService, UploadedImageFile } from './file-upload.service';

const { v2: cloudinary } = require('cloudinary');

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    url: jest.fn((publicId: string) => `https://res.cloudinary.com/demo/${publicId}`),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}), { virtual: true });

describe('FileUploadService', () => {
  let service: FileUploadService;
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret',
        CLOUDINARY_ROOT_FOLDER: 'fleeting-commerce',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const file = {
    buffer: Buffer.from('image'),
    mimetype: 'image/png',
    originalname: 'product.png',
  } as UploadedImageFile;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FileUploadService(configService);
  });

  it('accepts valid product images and rejects invalid files', () => {
    const options = service.getMulterConfig();
    const callback = jest.fn();

    options.fileFilter?.({} as any, file as any, callback);
    expect(callback).toHaveBeenCalledWith(null, true);

    options.fileFilter?.(
      {} as any,
      { ...file, mimetype: 'application/pdf' },
      callback,
    );
    expect(callback.mock.calls[1][0]).toBeInstanceOf(Error);
    expect(callback.mock.calls[1][1]).toBe(false);
  });

  it('builds tenant-specific folders', () => {
    expect(service.getProductFolder('tenant-1', 'product-1')).toBe(
      'fleeting-commerce/tenants/tenant-1/products/product-1',
    );
    expect(service.getBrandFolder('tenant-1')).toBe(
      'fleeting-commerce/tenants/tenant-1/brand',
    );
  });

  it('uploads a file and returns optimized Cloudinary metadata', async () => {
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (options, callback) => ({
        end: () =>
          callback(null, {
            public_id: 'folder/image-id',
            secure_url: 'https://secure.example/image-id',
          }),
      }),
    );

    const result = await service.uploadImage(
      file,
      service.getProductFolder('tenant-1', 'product-1'),
      'product',
    );

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: 'fleeting-commerce/tenants/tenant-1/products/product-1',
        resource_type: 'image',
      }),
      expect.any(Function),
    );
    expect(cloudinary.url).toHaveBeenCalledWith(
      'folder/image-id',
      expect.objectContaining({
        secure: true,
        transformation: [expect.objectContaining({ width: 1600 })],
      }),
    );
    expect(result).toEqual({
      publicId: 'folder/image-id',
      secureUrl: 'https://secure.example/image-id',
      optimizedUrl: 'https://res.cloudinary.com/demo/folder/image-id',
    });
  });

  it('rejects empty upload buffers', async () => {
    await expect(
      service.uploadImage(
        { ...file, buffer: Buffer.alloc(0) },
        service.getBrandFolder('tenant-1'),
        'brand-logo',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes images by public ID', async () => {
    (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

    await service.deleteImage('folder/image-id');

    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      'folder/image-id',
      expect.objectContaining({ invalidate: true, resource_type: 'image' }),
    );
  });
});
