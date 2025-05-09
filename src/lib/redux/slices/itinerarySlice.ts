import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  Activity,
  DayPlan,
  Itinerary,
  ItineraryWithDetails,
} from "@/lib/models";
import {
  createItinerary,
  deleteItinerary,
  getItineraryWithDetails,
  getUserItineraries,
  saveActivity,
  updateItinerary,
} from "@/lib/itineray-service";

// Helper function to serialize dates
const serializeDates = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates);
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      result[key] = serializeDates(obj[key]);
    }
    return result;
  }

  return obj;
};

interface ItineraryState {
  itineraries: Itinerary[];
  currentItinerary: ItineraryWithDetails | null;
  loading: boolean;
  error: string | null;
  lastRefreshTime: string | null;
}

const initialState: ItineraryState = {
  itineraries: [],
  currentItinerary: null,
  loading: false,
  error: null,
  lastRefreshTime: null,
};

// Async thunks for itineraries
export const fetchUserItinerariesAsync = createAsyncThunk(
  "itineraries/fetchUserItineraries",
  async (userId: string, { rejectWithValue }) => {
    try {
      const itineraries = await getUserItineraries(userId);
      return serializeDates(itineraries); // Serialize dates
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchItineraryWithDetailsAsync = createAsyncThunk(
  "itineraries/fetchItineraryWithDetails",
  async (itineraryId: string, { rejectWithValue }) => {
    try {
      const itineraryDetails = await getItineraryWithDetails(itineraryId);

      if (!itineraryDetails) {
        return rejectWithValue("Itinerary not found");
      }

      return serializeDates(itineraryDetails); // Serialize dates
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createItineraryAsync = createAsyncThunk(
  "itineraries/createItinerary",
  async (
    {
      itinerary,
      dayPlans,
      activities,
    }: {
      itinerary: Omit<Itinerary, "id" | "createdAt" | "updatedAt">;
      dayPlans?: Omit<
        DayPlan,
        "id" | "itineraryId" | "createdAt" | "updatedAt" | "activities"
      >[];
      activities?: {
        [dayPlanIndex: number]: Omit<
          Activity,
          "id" | "dayPlanId" | "createdAt" | "updatedAt"
        >[];
      };
    },
    { rejectWithValue }
  ) => {
    try {
      const createdItinerary = await createItinerary(
        itinerary,
        dayPlans,
        activities
      );

      if (!createdItinerary) {
        return rejectWithValue("Failed to create itinerary");
      }

      return serializeDates(createdItinerary); // Serialize dates
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateItineraryAsync = createAsyncThunk(
  "itineraries/updateItinerary",
  async (
    {
      itineraryId,
      updatedData,
    }: {
      itineraryId: string;
      updatedData: Partial<Omit<Itinerary, "id" | "createdAt" | "updatedAt">>;
    },
    { rejectWithValue }
  ) => {
    try {
      const updatedItinerary = await updateItinerary(itineraryId, updatedData);

      if (!updatedItinerary) {
        return rejectWithValue("Failed to update itinerary");
      }

      return serializeDates(updatedItinerary); // Serialize dates
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const saveActivityAsync = createAsyncThunk(
  "itineraries/saveActivity",
  async (activity: Partial<Activity>, { rejectWithValue }) => {
    try {
      // If _delete is true, it's a delete operation
      if (activity._delete && activity.id) {
        // Call the service to delete the activity
        // For now, let's assume we have a deleteActivity function
        // await deleteActivity(activity.id);
        return { id: activity.id, deleted: true };
      }

      // Otherwise, it's a create/update operation
      const savedActivity = await saveActivity(activity as Activity);

      if (!savedActivity) {
        return rejectWithValue("Failed to save activity");
      }

      return serializeDates(savedActivity); // Serialize dates
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteItineraryAsync = createAsyncThunk(
  "itineraries/deleteItinerary",
  async (itineraryId: string, { rejectWithValue }) => {
    try {
      const success = await deleteItinerary(itineraryId);

      if (!success) {
        return rejectWithValue("Failed to delete itinerary");
      }

      return itineraryId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const itinerarySlice = createSlice({
  name: "itineraries",
  initialState,
  reducers: {
    clearItineraryError: (state) => {
      state.error = null;
    },
    setLastRefreshTime: (state, action) => {
      // Store as ISO string instead of Date object
      state.lastRefreshTime =
        typeof action.payload === "string"
          ? action.payload
          : action.payload instanceof Date
          ? action.payload.toISOString()
          : new Date().toISOString();
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user itineraries cases
      .addCase(fetchUserItinerariesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserItinerariesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = action.payload;
        state.lastRefreshTime = new Date().toISOString(); // Store as ISO string
      })
      .addCase(fetchUserItinerariesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch itinerary with details cases
      .addCase(fetchItineraryWithDetailsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItineraryWithDetailsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentItinerary = action.payload;
      })
      .addCase(fetchItineraryWithDetailsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create itinerary cases
      .addCase(createItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries.unshift(action.payload);
      })
      .addCase(createItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update itinerary cases
      .addCase(updateItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updatedItinerary = action.payload;

        // Update in itineraries array
        state.itineraries = state.itineraries.map((itinerary) =>
          itinerary.id === updatedItinerary.id ? updatedItinerary : itinerary
        );

        // Update currentItinerary if it's the one that was updated
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.id === updatedItinerary.id
        ) {
          state.currentItinerary = {
            ...state.currentItinerary,
            itinerary: updatedItinerary,
          };
        }
      })
      .addCase(updateItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Save activity cases
      .addCase(saveActivityAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveActivityAsync.fulfilled, (state, action) => {
        state.loading = false;
        // We'll handle activity updates by re-fetching the itinerary
      })
      .addCase(saveActivityAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete itinerary cases
      .addCase(deleteItineraryAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteItineraryAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.itineraries = state.itineraries.filter(
          (itinerary) => itinerary.id !== action.payload
        );
        if (
          state.currentItinerary &&
          state.currentItinerary.itinerary.id === action.payload
        ) {
          state.currentItinerary = null;
        }
      })
      .addCase(deleteItineraryAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearItineraryError, setLastRefreshTime } =
  itinerarySlice.actions;
export default itinerarySlice.reducer;
