export interface ProductType {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  barCode: string | null;
  ingredients: string | null;
  active: boolean;
  images: image[];
}
export interface OrderItemType {
  id: string;
  createdAt: string;
  updatedAt: string;
  product: ProductType;
  quantity: number;
  totalPrice: string;
}
export interface OrderType {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  subtotal: number;
  tax: string;
  total: number;

  note: string | null;

  items: OrderItemType[];
}

export interface image {
  id: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;

}