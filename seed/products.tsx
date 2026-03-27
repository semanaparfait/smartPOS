export interface Product {
    id: number;
    name: string;
    category: 'Beverage' | 'Food' | 'Snacks' | 'Electronics' | 'Household';
    buyPrice: number;
    sellPrice: number;
    imageUrl: string;
    code: string;
    stock: number;
}

export const products: Product[] = [
    // --- BEVERAGES ---
    {
        id: 1,
        name: 'Inyange Milk 500ml',
        category: 'Beverage',
        buyPrice: 600,
        sellPrice: 800,
        imageUrl: 'https://i.pinimg.com/1200x/b1/6d/4d/b16d4ddca2fa06f17292e8532ccd8a9f.jpg',
        code: '600001',
        stock: 45
    },
    {
        id: 2,
        name: 'Skol Lager 33cl',
        category: 'Beverage',
        buyPrice: 700,
        sellPrice: 1000,
        imageUrl: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?q=80&w=300&auto=format&fit=crop',
        code: '600002',
        stock: 120
    },
    {
        id: 3,
        name: 'Coca Cola 300ml',
        category: 'Beverage',
        buyPrice: 450,
        sellPrice: 600,
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=300&auto=format&fit=crop',
        code: '600003',
        stock: 200
    },
    {
        id: 4,
        name: 'Akandi Water 500ml',
        category: 'Beverage',
        buyPrice: 250,
        sellPrice: 400,
        imageUrl: 'https://i.pinimg.com/1200x/61/8b/a4/618ba40511cadd2fe91b2e91b2cd6887.jpg',
        code: '600004',
        stock: 300
    },

    // --- FOOD & GRAINS ---
    {
        id: 5,
        name: 'Basmati Rice 1kg',
        category: 'Food',
        buyPrice: 1800,
        sellPrice: 2200,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?q=80&w=300&auto=format&fit=crop',
        code: '700001',
        stock: 60
    },
    {
        id: 6,
        name: 'Sunflower Oil 1L',
        category: 'Food',
        buyPrice: 2500,
        sellPrice: 3000,
        imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=300&auto=format&fit=crop',
        code: '700002',
        stock: 25
    },
    {
        id: 7,
        name: 'White Sugar 1kg',
        category: 'Food',
        buyPrice: 1200,
        sellPrice: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?q=80&w=300&auto=format&fit=crop',
        code: '700003',
        stock: 80
    },
    {
        id: 8,
        name: 'Spaghetti 500g',
        category: 'Food',
        buyPrice: 800,
        sellPrice: 1100,
        imageUrl: 'https://i.pinimg.com/1200x/4d/a3/16/4da316c6c91aada8a62c0ac3b327f463.jpg',
        code: '700004',
        stock: 100
    },

    // --- SNACKS ---
    {
        id: 9,
        name: 'Simba Soda',
        category: 'Snacks',
        buyPrice: 300,
        sellPrice: 500,
        imageUrl: 'https://i.pinimg.com/1200x/5c/c7/c2/5cc7c2907e40a5cd0d7e5d003db36e92.jpg',
        code: '800001',
        stock: 50
    },
    {
        id: 10,
        name: 'Potato Crisps 50g',
        category: 'Snacks',
        buyPrice: 400,
        sellPrice: 700,
        imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?q=80&w=300&auto=format&fit=crop',
        code: '800002',
        stock: 150
    },
    {
        id: 11,
        name: 'Roasted Peanuts',
        category: 'Snacks',
        buyPrice: 200,
        sellPrice: 400,
        imageUrl: 'https://images.unsplash.com/photo-1569460275615-7dc3dfc40389?q=80&w=300&auto=format&fit=crop',
        code: '800003',
        stock: 90
    },
    {
        id: 12,
        name: 'Digestive Biscuits',
        category: 'Snacks',
        buyPrice: 500,
        sellPrice: 800,
        imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=300&auto=format&fit=crop',
        code: '800004',
        stock: 75
    },

    // --- HOUSEHOLD ---
    {
        id: 13,
        name: 'Bar Soap (Blue)',
        category: 'Household',
        buyPrice: 600,
        sellPrice: 800,
        imageUrl: 'https://images.unsplash.com/photo-1605264964528-06403738d6dc?q=80&w=300&auto=format&fit=crop',
        code: '900001',
        stock: 110
    },
    {
        id: 14,
        name: 'Washing Powder 1kg',
        category: 'Household',
        buyPrice: 1500,
        sellPrice: 2000,
        imageUrl: 'https://images.unsplash.com/photo-1584622781564-1d9876a13d00?q=80&w=300&auto=format&fit=crop',
        code: '900002',
        stock: 40
    },
    {
        id: 15,
        name: 'Toilet Tissue (4pk)',
        category: 'Household',
        buyPrice: 1000,
        sellPrice: 1400,
        imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=300&auto=format&fit=crop',
        code: '900003',
        stock: 65
    },
    {
        id: 16,
        name: 'Dish Soap 500ml',
        category: 'Household',
        buyPrice: 1100,
        sellPrice: 1500,
        imageUrl: 'https://images.unsplash.com/photo-1585837575652-267c041d77d4?q=80&w=300&auto=format&fit=crop',
        code: '900004',
        stock: 55
    },

    // --- ELECTRONICS ---
    {
        id: 17,
        name: 'AA Batteries (4pcs)',
        category: 'Electronics',
        buyPrice: 1200,
        sellPrice: 1800,
        imageUrl: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?q=80&w=300&auto=format&fit=crop',
        code: '100001',
        stock: 30
    },
    {
        id: 18,
        name: 'USB-C Cable 1m',
        category: 'Electronics',
        buyPrice: 2000,
        sellPrice: 3500,
        imageUrl: 'https://images.unsplash.com/photo-1586760165882-946a997a607e?q=80&w=300&auto=format&fit=crop',
        code: '100002',
        stock: 20
    },
    {
        id: 19,
        name: 'LED Bulb 9W',
        category: 'Electronics',
        buyPrice: 1500,
        sellPrice: 2500,
        imageUrl: 'https://images.unsplash.com/photo-1550913295-7b9d3662e0d7?q=80&w=300&auto=format&fit=crop',
        code: '100003',
        stock: 40
    },
    {
        id: 20,
        name: 'Extension Cord 3m',
        category: 'Electronics',
        buyPrice: 4500,
        sellPrice: 6500,
        imageUrl: 'https://images.unsplash.com/photo-1626078299034-9615784e62a0?q=80&w=300&auto=format&fit=crop',
        code: '100004',
        stock: 15
    }
];