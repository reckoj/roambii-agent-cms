import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { Package } from "@/types/package";
import { getPackageById, deletePackage } from "@/lib/package-service";

// Serializable document reference
interface SerializableDocRef {
  id: string;
}

interface PackageState {
  packages: Package[];
  selectedPackage: Package | null;
  loading: boolean;
  error: string | null;
  lastVisible: SerializableDocRef | null;
  hasMore: boolean;
}

const initialState: PackageState = {
  packages: [],
  selectedPackage: null,
  loading: false,
  error: null,
  lastVisible: null,
  hasMore: true,
};

export const packageSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {
    setPackages: (state, action: PayloadAction<Package[]>) => {
      state.packages = action.payload;
    },
    setSelectedPackage: (state, action: PayloadAction<Package | null>) => {
      state.selectedPackage = action.payload;
    },
    clearPackages: (state) => {
      state.packages = [];
    },
    addPackage: (state, action: PayloadAction<Package>) => {
      state.packages.unshift(action.payload);
    },
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.packages.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.packages[index] = action.payload;
      }
    },
    removePackage: (state, action: PayloadAction<string>) => {
      state.packages = state.packages.filter(pkg => pkg.id !== action.payload);
    },
    setLastVisible: (state, action: PayloadAction<SerializableDocRef | null>) => {
      state.lastVisible = action.payload;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    }
  },
});

export const {
  setPackages,
  setSelectedPackage,
  clearPackages,
  addPackage,
  updatePackage,
  removePackage,
  setLastVisible,
  setHasMore
} = packageSlice.actions;

export default packageSlice.reducer; 