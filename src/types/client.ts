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
  lastBookingDate: Date | string;
  notes?: string;
  preferences?: {
    destinations?: string[];
    accommodationType?: string;
    budgetRange?: string;
    travelStyle?: string[];
    specialRequirements?: string[];
  };
  bookings?: string[]; // IDs of related bookings
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ClientFilter {
  status?: 'active' | 'inactive' | 'all';
  sortBy?: 'lastBookingDate' | 'totalSpent' | 'totalBookings';
  sortDirection?: 'asc' | 'desc';
  searchTerm?: string;
} 