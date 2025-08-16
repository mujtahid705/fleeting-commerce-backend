# Image Upload Functionality

This project now supports image uploads for products with the following features:

## Features

- **Multiple Image Support**: Up to 5 images per product
- **File Validation**: Only accepts image files (jpg, jpeg, png, gif, webp)
- **File Size Limit**: Maximum 5MB per image
- **Automatic Slug Generation**: Product slugs are automatically generated from titles
- **Image Ordering**: Images are stored with order for consistent display
- **Static File Serving**: Images are accessible via HTTP URLs

## API Endpoints

### Create Product with Images

**POST** `/api/products/create`

**Headers:**

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**

- `title`: Product title (required)
- `description`: Product description (required)
- `price`: Product price (required, number)
- `stock`: Available stock (required, number)
- `categoryId`: Category ID (required, number)
- `subCategoryId`: Sub-category ID (optional, number)
- `brand`: Brand name (optional, string)
- `images`: Image files (optional, max 5 files)

**Example Response:**

```json
{
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "title": "Product Name",
    "slug": "product-name",
    "description": "Product description",
    "price": 99.99,
    "stock": 100,
    "categoryId": 1,
    "subCategoryId": 2,
    "brand": "Brand Name",
    "createdBy": "user-uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "images": [
      {
        "id": "image-uuid",
        "imageUrl": "/uploads/products/filename.jpg",
        "order": 0
      }
    ],
    "category": { ... },
    "subCategory": { ... }
  }
}
```

### Get Products with Images

**GET** `/api/products/all`

**Query Parameters:**

- `category`: Filter by category ID (optional)
- `subCategory`: Filter by sub-category ID (optional)

**Example Response:**

```json
{
  "message": "Products fetched successfully",
  "categoryId": 1,
  "subCategoryId": 2,
  "data": [
    {
      "id": "uuid",
      "title": "Product Name",
      "images": [
        {
          "id": "image-uuid",
          "imageUrl": "/uploads/products/filename.jpg",
          "order": 0
        }
      ]
      // ... other product fields
    }
  ]
}
```

### Get Single Product with Images

**GET** `/api/products/:id`

**Example Response:**

```json
{
  "message": "Product fetched successfully",
  "data": {
    "id": "uuid",
    "title": "Product Name",
    "images": [
      {
        "id": "image-uuid",
        "imageUrl": "/uploads/products/filename.jpg",
        "order": 0
      }
    ]
    // ... other product fields
  }
}
```

## File Storage

- **Upload Directory**: `./uploads/products/`
- **File Naming**: Unique UUID-based names to prevent conflicts
- **Access URL**: Images are accessible at `/uploads/products/filename.ext`
- **Static Serving**: Configured in `main.ts` to serve files from the uploads directory

## Database Schema

### Product Model

```prisma
model Product {
  id            String   @id @default(uuid())
  title         String
  slug          String   @unique
  description   String?
  price         Float
  stock         Int
  categoryId    Int
  subCategoryId Int?
  createdBy     String
  brand         String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relations
  creator       User     @relation(fields: [createdBy], references: [id])
  category      Category @relation(fields: [categoryId], references: [id])
  subCategory   SubCategory? @relation(fields: [subCategoryId], references: [id])
  images        ProductImage[]

  @@index([createdBy])
}
```

### ProductImage Model

```prisma
model ProductImage {
  id        String   @id @default(uuid())
  productId String
  imageUrl  String
  order     Int      @default(0)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
}
```

## Usage Examples

### Frontend (JavaScript/FormData)

```javascript
const formData = new FormData();
formData.append('title', 'Product Title');
formData.append('description', 'Product Description');
formData.append('price', '99.99');
formData.append('stock', '100');
formData.append('categoryId', '1');
formData.append('brand', 'Brand Name');

// Add images
for (let i = 0; i < imageFiles.length; i++) {
  formData.append('images', imageFiles[i]);
}

const response = await fetch('/api/products/create', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

### Frontend (React with axios)

```jsx
import axios from 'axios';

const createProduct = async (productData, imageFiles) => {
  const formData = new FormData();

  // Add product data
  Object.keys(productData).forEach((key) => {
    formData.append(key, productData[key]);
  });

  // Add images
  imageFiles.forEach((file) => {
    formData.append('images', file);
  });

  try {
    const response = await axios.post('/api/products/create', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
  }
};
```

## Security Features

- **JWT Authentication Required**: All product creation endpoints require valid JWT tokens
- **File Type Validation**: Only image files are accepted
- **File Size Limits**: Prevents large file uploads
- **Unique File Names**: UUID-based naming prevents path traversal attacks
- **User Association**: Products are associated with authenticated users

## Error Handling

The API will return appropriate error messages for:

- Invalid file types
- File size exceeded
- Missing required fields
- Authentication failures
- Database errors

## Notes

- Images are stored locally in the `uploads/products/` directory
- For production, consider using cloud storage services (AWS S3, Google Cloud Storage, etc.)
- The `slug` field is automatically generated from the product title
- Images are ordered by the `order` field for consistent display
- Deleted products will cascade delete associated images
