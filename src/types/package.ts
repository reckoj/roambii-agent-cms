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
  checkInDate: Date;
  checkOutDate: Date;
  checkInTime: Date;
  checkOutTime: Date;
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
    departingTime?: Date;
    arrivingToTime?: Date;
    returningFromTime?: Date;
    returningToTime?: Date;
    departureDate?: Date;
    returnDate?: Date;
  };
  createdAt?: string;
  updatedAt?: string;
} 