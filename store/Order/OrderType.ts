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
  user: imployee;
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

export interface imployee {
          
            id: string;
            createdAt: string;
            updatedAt: string;
            employee: {
                id: string;
                createdAt: string;
                updatedAt: string;
                name: string;
                email: string;
                phone: string;
                salary: number;
                shift: string;
            },
            name: string;
            email: string;
            phone: string;
            pin: string;
            password: string;
            role: string;
            active: boolean;
            mustChangePassword: boolean;
            lastLoginAt: string;
        
}