export type categoryType = {
  id?: string;
  name: string;
  picture?: string;
};

export type  categoriesResponse = {
       id:string;
       createdAt:string;
       updatedAt:string;
       image: {
           id:string;
           createdAt:string;
           updatedAt:string;
           name:string;
           url:string;
           type:string;
           mimeType:string;
           size: number;
        },
       name:string;
    }