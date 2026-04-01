export interface Category {
  id: number;
  name: string;
  imageUrl: string;
}

export const categories: Category[] = [
  {
    id: 1,
    name: "Beverage",
    imageUrl:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Food",
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Snacks",
    imageUrl:
      "https://images.unsplash.com/photo-1585238342024-78d387f4a707?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Household",
    imageUrl:
      "https://images.unsplash.com/photo-1583947215259-38e31be8751f?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Electronics",
    imageUrl:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Personal Care",
    imageUrl:
      "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?q=80&w=800&auto=format&fit=crop",
  },
];
