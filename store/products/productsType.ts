// export interface Product{
//   id: string,
//   categoryId: string,
//   name: string,
//   img: string,
//   buyingPrice: number,
//   sellingPrice: number,
//   barCode: string,
//   ingredients: string
// }


export interface ProductImage {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  url: string;
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
  buyingPrice: string;
  sellingPrice: string;
  barCode: string;
  ingredients: string;
  active: boolean;
}