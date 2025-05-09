export interface Booking {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  packageId: string;
  packageName: string;
  agentId: string;
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  totalPaid: number;
  balance: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  travelers: number;
  notes?: string;
  paymentMethod?: string;
  paymentStatus: "unpaid" | "partially_paid" | "paid";
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingFilter {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
  clientId?: string;
  packageId?: string;
}

export interface BookingStats {
  total: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  revenue: number;
  revenueMonth: number;
  bookingsMonth: number;
}

export interface PaymentDetails {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: "successful" | "failed" | "pending";
  transactionId?: string;
  date: Date | string;
  notes?: string;
}
