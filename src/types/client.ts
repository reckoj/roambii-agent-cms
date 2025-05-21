export interface Client {
  id: string;
  userId: string;
  agentId: string;
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
  };
  status: 'active' | 'inactive';
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string; // ISO date string
  notes?: string;
  preferences?: {
    destinations?: string[];
    accommodationType?: string;
    budgetRange?: string;
    travelStyle?: string[];
    specialRequirements?: string[];
  };
  bookings?: string[]; // IDs of related bookings
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ClientFilter {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'lastBookingDate' | 'totalSpent' | 'totalBookings';
  sortDirection?: 'asc' | 'desc';
  searchTerm?: string;
} 