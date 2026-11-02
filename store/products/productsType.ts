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
  // How it is bought, when that differs: a Tray of 30, counted in Piece.
  purchaseUnit: string | null;
  purchaseSize: number | string | null;
  sku: string | null;
  supplier: string | null;
  description: string | null;
  trackStock: boolean;
  // Decimals arrive as text. Can be below 0: a sale is never blocked by stock.
  stockQuantity: number | string;
  lowStockLevel: number | string | null;
  expiryDate: string | null;
  sendToKitchen: boolean;
  // Stock used to make other products; never sold on its own.
  isIngredient: boolean;
  // How many its ingredients allow; null when it doesn't depend on stock.
  canMake?: number | null;
  createdBy: AuditActor | null;
  updatedBy: AuditActor | null;
}

// How much of an ingredient one unit of a product uses, in the ingredient's unit.
export interface RecipeLine {
  ingredientId: string;
  quantity: number;
}

// A free picture found by name; sent back as `pictureUrl` to keep a copy of it.
export interface ImageResult {
  url: string;
  // Small version for the results grid.
  thumbnail: string;
  title: string;
  license: string | null;
  author: string | null;
}

// One ingredient over a period, valued at its current cost.
export interface IngredientUsage {
  id: string;
  name: string;
  unit: string;
  cost: number;
  used: number;
  wasted: number;
  received: number;
}

// A product whose recipe uses an ingredient, and how much one of it takes.
export interface UsedInProduct {
  id: string;
  name: string;
  quantity: number;
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
  reason: "SALE" | "RESTOCK" | "ADJUSTMENT" | "WASTE" | "REFUND";
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