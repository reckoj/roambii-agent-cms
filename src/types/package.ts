export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  type: string;
  amenities: string[];
  allinclusive: boolean;
  roomType: string;
  bedrooms: number;
  bathrooms: number;
  guestAmount: number;
  rating: number;
  isFeatured: boolean;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  salesCount: number;
  agent: {
    id: string;
    name: string;
    avatar?: string;
  };
  image?: string;
  flightInfo?: {
    id: string;
    departingFrom?: string;
    arrivingTo?: string;
    returningFrom?: string;
    returningTo?: string;
    departingTime?: string;
    arrivingToTime?: string;
    returningFromTime?: string;
    returningToTime?: string;
    departureDate?: string;
    returnDate?: string;
  };
  createdAt?: string;
  updatedAt?: string;
} 