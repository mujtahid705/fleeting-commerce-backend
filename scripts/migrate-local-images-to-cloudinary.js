"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs_1 = require("fs");
const path_1 = require("path");
const client_1 = require("@prisma/client");
const { v2: cloudinary } = require('cloudinary');
const prisma = new client_1.PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const rootFolder = process.env.CLOUDINARY_ROOT_FOLDER || 'fleeting-commerce';
const stats = {
    migrated: 0,
    skipped: 0,
    missing: 0,
    failed: 0,
};
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
function assertCloudinaryConfig() {
    if (!process.env.CLOUDINARY_CLOUD_NAME ||
        !process.env.CLOUDINARY_API_KEY ||
        !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are not configured');
    }
}
function widthForVariant(variant) {
    return {
        product: 1600,
        'brand-logo': 600,
        'brand-hero': 2400,
        'brand-exclusive': 1200,
    }[variant];
}
function optimizedUrl(publicId, variant) {
    return cloudinary.url(publicId, {
        secure: true,
        resource_type: 'image',
        transformation: [
            {
                fetch_format: 'auto',
                quality: 'auto',
                crop: 'limit',
                width: widthForVariant(variant),
            },
        ],
    });
}
function localPathFromUrl(url) {
    if (!url)
        return null;
    if (url.startsWith('https://'))
        return null;
    if (!url.startsWith('/uploads/'))
        return null;
    return (0, path_1.join)(process.cwd(), url.replace(/^\//, ''));
}
function countSkipped(url) {
    if (!url || url.startsWith('https://') || !url.startsWith('/uploads/')) {
        stats.skipped += 1;
        return true;
    }
    return false;
}
async function uploadLocalImage(filePath, folder, variant) {
    const result = (await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        unique_filename: true,
        use_filename: false,
        overwrite: false,
    }));
    return {
        optimizedUrl: optimizedUrl(result.public_id, variant),
        publicId: result.public_id,
    };
}
async function destroyUploaded(publicIds) {
    await Promise.all(publicIds.map((publicId) => cloudinary.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: 'image',
    })));
}
async function migrateProductImages() {
    const productImages = await prisma.productImage.findMany({
        include: {
            product: {
                select: {
                    id: true,
                    tenantId: true,
                },
            },
        },
    });
    for (const image of productImages) {
        if (countSkipped(image.imageUrl))
            continue;
        const filePath = localPathFromUrl(image.imageUrl);
        if (!filePath || !(0, fs_1.existsSync)(filePath)) {
            stats.missing += 1;
            console.warn(`Missing product image file: ${image.imageUrl}`);
            continue;
        }
        const folder = `${rootFolder}/tenants/${image.product.tenantId}/products/${image.product.id}`;
        if (dryRun) {
            stats.migrated += 1;
            console.log(`[dry-run] Would migrate product image ${image.id}`);
            continue;
        }
        let uploaded;
        try {
            uploaded = await uploadLocalImage(filePath, folder, 'product');
            await prisma.productImage.update({
                where: { id: image.id },
                data: {
                    imageUrl: uploaded.optimizedUrl,
                    cloudinaryPublicId: uploaded.publicId,
                },
            });
            stats.migrated += 1;
            console.log(`Migrated product image ${image.id}`);
        }
        catch (error) {
            stats.failed += 1;
            if (uploaded)
                await destroyUploaded([uploaded.publicId]);
            console.error(`Failed to migrate product image ${image.id}:`, error);
        }
    }
}
async function migrateBrandImage(tenantId, url, variant) {
    if (countSkipped(url))
        return null;
    const filePath = localPathFromUrl(url);
    if (!filePath || !(0, fs_1.existsSync)(filePath)) {
        stats.missing += 1;
        console.warn(`Missing brand image file: ${url}`);
        return null;
    }
    if (dryRun) {
        stats.migrated += 1;
        console.log(`[dry-run] Would migrate brand image ${url}`);
        return null;
    }
    const folder = `${rootFolder}/tenants/${tenantId}/brand`;
    const uploaded = await uploadLocalImage(filePath, folder, variant);
    stats.migrated += 1;
    return uploaded;
}
async function migrateTenantBrands() {
    const brands = await prisma.tenantBrand.findMany();
    for (const brand of brands) {
        const uploadedPublicIds = [];
        const updateData = {};
        try {
            const logo = await migrateBrandImage(brand.tenantId, brand.logoUrl, 'brand-logo');
            if (logo) {
                uploadedPublicIds.push(logo.publicId);
                updateData.logoUrl = logo.optimizedUrl;
                updateData.logoPublicId = logo.publicId;
            }
            const hero = brand.hero ? { ...brand.hero } : null;
            const heroImage = await migrateBrandImage(brand.tenantId, hero?.backgroundImage, 'brand-hero');
            if (hero && heroImage) {
                uploadedPublicIds.push(heroImage.publicId);
                hero.backgroundImage = heroImage.optimizedUrl;
                hero.backgroundImagePublicId = heroImage.publicId;
                updateData.hero = hero;
            }
            const exclusiveSection = brand.exclusiveSection
                ? { ...brand.exclusiveSection }
                : null;
            if (Array.isArray(exclusiveSection?.products)) {
                const products = [...exclusiveSection.products];
                let exclusiveChanged = false;
                for (let index = 0; index < products.length; index += 1) {
                    const customImage = await migrateBrandImage(brand.tenantId, products[index]?.customImage, 'brand-exclusive');
                    if (customImage) {
                        uploadedPublicIds.push(customImage.publicId);
                        products[index] = {
                            ...products[index],
                            customImage: customImage.optimizedUrl,
                            customImagePublicId: customImage.publicId,
                        };
                        exclusiveChanged = true;
                    }
                }
                exclusiveSection.products = products;
                if (exclusiveChanged) {
                    updateData.exclusiveSection = exclusiveSection;
                }
            }
            if (!dryRun && Object.keys(updateData).length > 0) {
                await prisma.tenantBrand.update({
                    where: { tenantId: brand.tenantId },
                    data: updateData,
                });
                console.log(`Migrated brand images for tenant ${brand.tenantId}`);
            }
        }
        catch (error) {
            stats.failed += 1;
            if (uploadedPublicIds.length > 0) {
                await destroyUploaded(uploadedPublicIds);
            }
            console.error(`Failed to migrate brand images for tenant ${brand.tenantId}:`, error);
        }
    }
}
async function main() {
    if (!dryRun)
        assertCloudinaryConfig();
    console.log(dryRun
        ? 'Running Cloudinary image migration in dry-run mode'
        : 'Running Cloudinary image migration');
    await migrateProductImages();
    await migrateTenantBrands();
    console.log('Migration complete:', stats);
}
main()
    .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=migrate-local-images-to-cloudinary.js.map