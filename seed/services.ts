export interface Service {
  id: string;
  imageUrl: string;
  customer: string;
  created_at: string;
  service_name: string;
  service_type:
    | "time_based"
    | "entry_based"
    | "rental_based"
    | "event_based"
    | "consumable_based"
    | "subscription_based";

  pricing_type:
    | "fixed"
    | "per_hour"
    | "per_person"
    | "per_session"
    | "per_day"
    | "package";

  price: number;

  capacity?: number;

  isActive: boolean;

  status:
    | "Available"
    | "Reserved"
    | "Occupied"
    | "Maintenance";

  description?: string;
}

export const services: Service[] = [
  {
    id: "1",
    customer:"cenci",
    imageUrl:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206",
    service_name: "Swimming Pooll",
    service_type: "entry_based",
    pricing_type: "per_person",
    price: 5000,
    capacity: 50,
    isActive: true,
    status: "Available",
    description: "Outdoor swimming pool for adults and children",
     created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "2",
    customer:"igabe",
    imageUrl:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
    service_name: "Sauna",
    service_type: "time_based",
    pricing_type: "per_hour",
    price: 10000,
    capacity: 8,
    isActive: true,
    status: "Occupied",
    description: "Relaxing steam sauna experience",
    created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "3",
    customer: "ngwino",
    imageUrl:
      "https://images.unsplash.com/photo-1517466787929-bc90951d0974",
    service_name: "Football Pitch",
    service_type: "rental_based",
    pricing_type: "per_hour",
    price: 25000,
    capacity: 22,
    isActive: true,
    status: "Reserved",
    description: "Professional football field for team matches",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "4",
    customer:"gilbert",
    imageUrl:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db",
    service_name: "PlayStation Room",
    service_type: "time_based",
    pricing_type: "per_hour",
    price: 5000,
    capacity: 6,
    isActive: true,
    status: "Available",
    description: "Gaming room with PS5 and large screens",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "5",
    customer:"mugwaneza",
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945",
    service_name: "Hotel Room",
    service_type: "subscription_based",
    pricing_type: "per_day",
    price: 75000,
    capacity: 2,
    isActive: true,
    status: "Occupied",
    description: "Deluxe hotel room with city view",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "6",
    customer:"kalisa",
    imageUrl:
      "https://images.unsplash.com/photo-1517457373958-b7bdd4587205",
    service_name: "Conference Hall",
    service_type: "event_based",
    pricing_type: "package",
    price: 500000,
    capacity: 300,
    isActive: true,
    status: "Available",
    description: "Large conference and event hall",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "7",
    customer:"ketia",
    imageUrl:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a",
    service_name: "Gym",
    service_type: "subscription_based",
    pricing_type: "per_session",
    price: 3000,
    capacity: 40,
    isActive: true,
    status: "Available",
    description: "Modern gym with professional equipment",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "8",
    customer:"niyonizeye",
    imageUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    service_name: "Spa Massage",
    service_type: "time_based",
    pricing_type: "per_session",
    price: 20000,
    capacity: 5,
    isActive: true,
    status: "Reserved",
    description: "Luxury massage and spa treatment",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "9",
    customer:"olga",
    imageUrl:
      "https://images.unsplash.com/photo-1552566626-52f8b828add9",
    service_name: "Restaurant Dining",
    service_type: "consumable_based",
    pricing_type: "fixed",
    price: 15000,
    capacity: 120,
    isActive: true,
    status: "Available",
    description: "Indoor and outdoor dining experience",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "10",
    customer:"messi",
    imageUrl:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b",
    service_name: "Bar & Lounge",
    service_type: "consumable_based",
    pricing_type: "fixed",
    price: 10000,
    capacity: 80,
    isActive: true,
    status: "Occupied",
    description: "Premium drinks and nightlife experience",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "11",
    customer:"gasana",
    imageUrl:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267",
    service_name: "VIP Suite",
    service_type: "subscription_based",
    pricing_type: "per_day",
    price: 250000,
    capacity: 4,
    isActive: true,
    status: "Reserved",
    description: "Luxury VIP suite with premium services",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "12",
    customer:"palmer",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
    service_name: "Kids Playground",
    service_type: "entry_based",
    pricing_type: "per_person",
    price: 2000,
    capacity: 25,
    isActive: true,
    status: "Available",
    description: "Safe and fun playground for children",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "13",
    customer: "enzo",
    imageUrl:
      "https://images.unsplash.com/photo-1494526585095-c41746248156",
    service_name: "Laundry Service",
    service_type: "consumable_based",
    pricing_type: "fixed",
    price: 5000,
    capacity: 100,
    isActive: true,
    status: "Available",
    description: "Professional laundry and dry cleaning",
         created_at:"",
  },

  {
    id: "14",
    customer:"caicedo",
    imageUrl:
      "https://images.unsplash.com/photo-1526772662000-3f88f10405ff",
    service_name: "Airport Pickup",
    service_type: "rental_based",
    pricing_type: "fixed",
    price: 30000,
    capacity: 4,
    isActive: true,
    status: "Available",
    description: "Private airport transfer service",
         created_at:"2026-05-27T10:30:00.000Z",
  },

  {
    id: "15",
    customer:"tonto",
    imageUrl:
      "https://images.unsplash.com/photo-1522770179533-24471fcdba45",
    service_name: "Room Service",
    service_type: "consumable_based",
    pricing_type: "fixed",
    price: 10000,
    capacity: 100,
    isActive: true,
    status: "Available",
    description: "24/7 in-room dining service",
         created_at:"2026-05-27T10:30:00.000Z",
  },
];