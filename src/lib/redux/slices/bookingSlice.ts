import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Booking,
  BookingFilter,
  BookingStats,
  PaymentDetails,
} from "@/types/booking";
import {
  getBookings,
  getBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingStats,
  addPayment,
  getBookingPayments,
} from "@/lib/booking-service";
import { DocumentSnapshot } from "firebase/firestore";

interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  bookingStats: BookingStats | null;
  payments: PaymentDetails[];
  loading: boolean;
  loadingStats: boolean;
  loadingPayments: boolean;
  error: string | null;
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
  filters: BookingFilter;
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  bookingStats: null,
  payments: [],
  loading: false,
  loadingStats: false,
  loadingPayments: false,
  error: null,
  lastVisible: null,
  hasMore: true,
  filters: {
    status: "all",
  },
};

// Async thunks
export const fetchBookingsAsync = createAsyncThunk(
  "bookings/fetchBookings",
  async (
    {
      agentId,
      filters,
      lastVisible,
      reset = false,
    }: {
      agentId: string;
      filters?: BookingFilter;
      lastVisible?: DocumentSnapshot | null;
      reset?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await getBookings(agentId, filters, lastVisible);
      return {
        bookings: result.bookings,
        lastVisible: result.lastVisible,
        reset,
      };
    } catch (error) {
      return rejectWithValue("Failed to fetch bookings");
    }
  }
);

export const fetchBookingStatsAsync = createAsyncThunk(
  "bookings/fetchStats",
  async (agentId: string, { rejectWithValue }) => {
    try {
      return await getBookingStats(agentId);
    } catch (error) {
      return rejectWithValue("Failed to fetch booking statistics");
    }
  }
);

export const fetchBookingByIdAsync = createAsyncThunk(
  "bookings/fetchBookingById",
  async (bookingId: string, { rejectWithValue }) => {
    try {
      const booking = await getBookingById(bookingId);
      if (!booking) {
        return rejectWithValue("Booking not found");
      }
      return booking;
    } catch (error) {
      return rejectWithValue("Failed to fetch booking details");
    }
  }
);

export const createBookingAsync = createAsyncThunk(
  "bookings/createBooking",
  async (bookingData: Omit<Booking, "id">, { rejectWithValue }) => {
    try {
      return await createBooking(bookingData);
    } catch (error) {
      return rejectWithValue("Failed to create booking");
    }
  }
);

export const updateBookingAsync = createAsyncThunk(
  "bookings/updateBooking",
  async (
    {
      id,
      bookingData,
    }: {
      id: string;
      bookingData: Partial<Booking>;
    },
    { rejectWithValue }
  ) => {
    try {
      return await updateBooking(id, bookingData);
    } catch (error) {
      return rejectWithValue("Failed to update booking");
    }
  }
);

export const deleteBookingAsync = createAsyncThunk(
  "bookings/deleteBooking",
  async (id: string, { rejectWithValue }) => {
    try {
      const success = await deleteBooking(id);
      return { id, success };
    } catch (error) {
      return rejectWithValue("Failed to delete booking");
    }
  }
);

export const addPaymentAsync = createAsyncThunk(
  "bookings/addPayment",
  async (paymentData: Omit<PaymentDetails, "id">, { rejectWithValue }) => {
    try {
      return await addPayment(paymentData);
    } catch (error) {
      return rejectWithValue("Failed to add payment");
    }
  }
);

export const fetchBookingPaymentsAsync = createAsyncThunk(
  "bookings/fetchPayments",
  async (bookingId: string, { rejectWithValue }) => {
    try {
      return await getBookingPayments(bookingId);
    } catch (error) {
      return rejectWithValue("Failed to fetch booking payments");
    }
  }
);

export const bookingSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
    setFilters: (state, action: PayloadAction<BookingFilter>) => {
      state.filters = action.payload;
      state.lastVisible = null;
      state.hasMore = true;
    },
    clearBookings: (state) => {
      state.bookings = [];
      state.lastVisible = null;
      state.hasMore = true;
    },
    clearBookingError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bookings
      .addCase(fetchBookingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingsAsync.fulfilled, (state, action) => {
        state.loading = false;

        // If reset is true, replace bookings array
        if (action.payload.reset) {
          state.bookings = action.payload.bookings;
        } else {
          // Otherwise, append to existing bookings
          state.bookings = [...state.bookings, ...action.payload.bookings];
        }

        state.lastVisible = action.payload.lastVisible;
        state.hasMore = !!action.payload.lastVisible;
      })
      .addCase(fetchBookingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch booking stats
      .addCase(fetchBookingStatsAsync.pending, (state) => {
        state.loadingStats = true;
        state.error = null;
      })
      .addCase(fetchBookingStatsAsync.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.bookingStats = action.payload;
      })
      .addCase(fetchBookingStatsAsync.rejected, (state, action) => {
        state.loadingStats = false;
        state.error = action.payload as string;
      })

      // Fetch booking by ID
      .addCase(fetchBookingByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookingByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBooking = action.payload;
      })
      .addCase(fetchBookingByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create booking
      .addCase(createBookingAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBookingAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.unshift(action.payload);
        state.selectedBooking = action.payload;
      })
      .addCase(createBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update booking
      .addCase(updateBookingAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBookingAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedBooking = action.payload;

        // Update in bookings array if present
        const index = state.bookings.findIndex(
          (b) => b.id === action.payload.id
        );
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      .addCase(updateBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete booking
      .addCase(deleteBookingAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBookingAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success) {
          state.bookings = state.bookings.filter(
            (booking) => booking.id !== action.payload.id
          );
          if (state.selectedBooking?.id === action.payload.id) {
            state.selectedBooking = null;
          }
        }
      })
      .addCase(deleteBookingAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add payment
      .addCase(addPaymentAsync.pending, (state) => {
        state.loadingPayments = true;
        state.error = null;
      })
      .addCase(addPaymentAsync.fulfilled, (state, action) => {
        state.loadingPayments = false;
        state.payments.unshift(action.payload);
      })
      .addCase(addPaymentAsync.rejected, (state, action) => {
        state.loadingPayments = false;
        state.error = action.payload as string;
      })

      // Fetch booking payments
      .addCase(fetchBookingPaymentsAsync.pending, (state) => {
        state.loadingPayments = true;
        state.error = null;
      })
      .addCase(fetchBookingPaymentsAsync.fulfilled, (state, action) => {
        state.loadingPayments = false;
        state.payments = action.payload;
      })
      .addCase(fetchBookingPaymentsAsync.rejected, (state, action) => {
        state.loadingPayments = false;
        state.error = action.payload as string;
      });
  },
});
export const {
  setSelectedBooking,
  setFilters,
  clearBookings,
  clearBookingError,
} = bookingSlice.actions;
export default bookingSlice.reducer;
