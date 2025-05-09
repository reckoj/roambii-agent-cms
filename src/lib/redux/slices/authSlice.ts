import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  agent: Agent | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  agent: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const logoutUserAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await signOut(auth);
      return null;
    } catch (error) {
      return rejectWithValue('Failed to logout');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAgent: (state, action: PayloadAction<Agent | null>) => {
      state.agent = action.payload;
      state.isAuthenticated = !!action.payload;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.agent = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logoutUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUserAsync.fulfilled, (state) => {
        state.agent = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAgent, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer; 