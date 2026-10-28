export interface ProductRequest {
  categoryId: string;
  name: string;
  picture: string;
  buyingPrice: number;
  sellingPrice: number;
  barCode?: string;
  ingredients?: string;
}


export interface ProductImage {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  url: string;
  // 300px version; use for cards and thumbnails.
  thumbnailUrl?: string;
  type: string;
  mimeType: string;
  size: number;
}

export interface Category {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
}

export interface ProductType {
  id: string;
  createdAt: string;
  updatedAt: string;
  category: Category;
  images: ProductImage[];
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  barCode: string;
  ingredients: string;
  active: boolean;
}