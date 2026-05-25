export interface Service {
    id: string;
    name: string;
    imageUrl: string;
    duration: number; 
    status: 'available' | 'unavailable';
    isActive: boolean;
  }

  export interface serviceUnity {
    id: string;
    name: string;
    price: number;
    capacity: number;
    pricing_type: 'per_unit' | 'per_hour' | 'per_person' | 'per_session' | 'per_day';
    serviceId: string; 
  }

  export const Services: Service[] = [
  {
    id: "s1",
    name: "Room Cleaning",
    imageUrl: "https://i.imgur.com/cleaning.jpg",
    duration: 30,
    status: "available",
    isActive: true,
  },
  {
    id: "s2",
    name: "Laundry Service",
    imageUrl: "https://i.imgur.com/laundry.jpg",
    duration: 120,
    status: "available",
    isActive: true,
  },
  {
    id: "s3",
    name: "Food Delivery (Room Service)",
    imageUrl: "https://i.imgur.com/roomservice.jpg",
    duration: 45,
    status: "available",
    isActive: true,
  },
  {
    id: "s4",
    name: "Spa & Massage",
    imageUrl: "https://i.imgur.com/spa.jpg",
    duration: 60,
    status: "available",
    isActive: true,
  },
  {
    id: "s5",
    name: "Airport Pickup",
    imageUrl: "https://i.imgur.com/airport.jpg",
    duration: 60,
    status: "available",
    isActive: true,
  },
  {
    id: "s6",
    name: "Wake-up Call Service",
    imageUrl: "https://i.imgur.com/wakeup.jpg",
    duration: 5,
    status: "available",
    isActive: true,
  },
  {
    id: "s7",
    name: "Swimming Pool Access",
    imageUrl: "https://i.imgur.com/pool.jpg",
    duration: 180,
    status: "available",
    isActive: true,
  },
  {
    id: "s8",
    name: "Gym Access",
    imageUrl: "https://i.imgur.com/gym.jpg",
    duration: 90,
    status: "available",
    isActive: true,
  },
  {
    id: "s9",
    name: "Car Rental",
    imageUrl: "https://i.imgur.com/car.jpg",
    duration: 1440,
    status: "available",
    isActive: true,
  },
  {
    id: "s10",
    name: "Conference Room Booking",
    imageUrl: "https://i.imgur.com/conference.jpg",
    duration: 240,
    status: "available",
    isActive: true,
  },
];