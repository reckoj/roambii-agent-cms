import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import packageReducer from "./slices/packageSlice";
import bookingReducer from "./slices/bookingSlice";
import itineraryReducer from "./slices/itinerarySlice";
import dashboardReducer from "./slices/dashboardSlice";
import agentProfileReducer from "./slices/agentProfileSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    packages: packageReducer,
    bookings: bookingReducer,
    itineraries: itineraryReducer,
    dashboard: dashboardReducer,
    agentProfile: agentProfileReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
