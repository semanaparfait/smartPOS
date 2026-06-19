export interface CartItemRequest {
seatId?: string;
}
export interface ProductResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  barCode: string | null;
  ingredients: string;
  active: boolean;
}

export interface CartItemsResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  product: ProductResponse;
  quantity: number;
  totalPrice: string;
}

export interface CartResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  totalAmount: string;
  seat?: string | null;
  items: CartItemsResponse[];
}