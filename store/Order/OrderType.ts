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

  subtotal: string;
  tax: string;
  total: string;

  note: string | null;

  items: OrderItemType[];
}