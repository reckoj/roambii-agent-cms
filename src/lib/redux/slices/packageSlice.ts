import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Package } from '@/types/package';

interface PackageState {
  packages: Package[];
  selectedPackage: Package | null;
  loading: boolean;
  error: string | null;
}

const initialState: PackageState = {
  packages: [],
  selectedPackage: null,
  loading: false,
  error: null,
};

const packageSlice = createSlice({
  name: 'packages',
  initialState,
  reducers: {
    setPackages: (state, action: PayloadAction<Package[]>) => {
      state.packages = action.payload;
      state.error = null;
    },
    setSelectedPackage: (state, action: PayloadAction<Package | null>) => {
      state.selectedPackage = action.payload;
    },
    addPackage: (state, action: PayloadAction<Package>) => {
      state.packages.push(action.payload);
    },
    updatePackage: (state, action: PayloadAction<Package>) => {
      const index = state.packages.findIndex(pkg => pkg.id === action.payload.id);
      if (index !== -1) {
        state.packages[index] = action.payload;
      }
    },
    deletePackage: (state, action: PayloadAction<string>) => {
      state.packages = state.packages.filter(pkg => pkg.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setPackages,
  setSelectedPackage,
  addPackage,
  updatePackage,
  deletePackage,
  setLoading,
  setError,
} = packageSlice.actions;

export default packageSlice.reducer; 