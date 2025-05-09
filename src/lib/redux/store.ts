import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import packageReducer from "./slices/packageSlice";
import bookingReducer from "./slices/bookingSlice";
import itineraryReducer from "./slices/itinerarySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    packages: packageReducer,
    bookings: bookingReducer,
    itineraries: itineraryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
