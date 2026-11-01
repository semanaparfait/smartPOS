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
  unit: string;
  sku: string | null;
  supplier: string | null;
  description: string | null;
  trackStock: boolean;
  // Decimals arrive as text. Can be below 0: a sale is never blocked by stock.
  stockQuantity: number | string;
  lowStockLevel: number | string | null;
  expiryDate: string | null;
  sendToKitchen: boolean;
  createdBy: AuditActor | null;
  updatedBy: AuditActor | null;
}

export interface AuditActor {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StockMovement {
  id: string;
  createdAt: string;
  change: number | string;
  quantityAfter: number | string;
  reason: "SALE" | "RESTOCK" | "ADJUSTMENT" | "REFUND";
  note: string | null;
  user: { id: string; name: string } | null;
}

export interface AuditEntry {
  id: string;
  createdAt: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entityId: string | null;
  // CREATE/DELETE: the whole record. UPDATE: { field: { from, to } }.
  changes: Record<string, any> | null;
  actor: AuditActor | null;
}