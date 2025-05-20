import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAgentRevenueStats, RevenueStats } from "@/lib/revenue-service";

// Define the dashboard state
interface DashboardState {
  revenueStats: RevenueStats | null;
  loadingRevenue: boolean;
  revenueError: string | null;
  lastFetchTime: string | null;
}

// Initial state
const initialState: DashboardState = {
  revenueStats: null,
  loadingRevenue: false,
  revenueError: null,
  lastFetchTime: null,
};

// Create the async thunk for fetching revenue data
export const fetchRevenueStatsAsync = createAsyncThunk(
  "dashboard/fetchRevenueStats",
  async (agentId: string, { rejectWithValue }) => {
    try {
      const stats = await getAgentRevenueStats(agentId);
      return stats;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch revenue statistics"
      );
    }
  }
);

// Create the dashboard slice
const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearRevenueStats: (state) => {
      state.revenueStats = null;
      state.revenueError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch revenue statistics cases
      .addCase(fetchRevenueStatsAsync.pending, (state) => {
        state.loadingRevenue = true;
        state.revenueError = null;
      })
      .addCase(fetchRevenueStatsAsync.fulfilled, (state, action) => {
        state.loadingRevenue = false;
        state.revenueStats = action.payload;
        state.lastFetchTime = new Date().toISOString();
      })
      .addCase(fetchRevenueStatsAsync.rejected, (state, action) => {
        state.loadingRevenue = false;
        state.revenueError = action.payload as string;
      });
  },
});

export const { clearRevenueStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;
