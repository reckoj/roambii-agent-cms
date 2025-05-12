import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { ensureUserDocument, logoutUser } from '@/lib/auth-helpers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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

export const loginUserAsync = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return rejectWithValue('Authentication can only be performed on the client side');
    }

    try {
      console.log('Attempting to sign in with:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('Firebase auth successful, user:', user.uid);
      
      // Get user document from Firestore to check if they are an agent
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists() || !userDoc.data().isAgent) {
        // Sign out the user if they are not an agent
        await signOut(auth);
        return rejectWithValue('Access denied. Only agents can access this platform.');
      }
      
      // Ensure user document exists in Firestore
      await ensureUserDocument(
        user.uid,
        user.email || undefined,
        user.displayName || undefined
      );
      
      console.log('User document ensured in Firestore');
      
      return {
        id: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        avatar: user.photoURL || undefined,
      };
    } catch (error: any) {
      // Handle errors without logging to console
      return rejectWithValue(error.message || 'Invalid email or password');
    }
  }
);

export const logoutUserAsync = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return rejectWithValue('Logout can only be performed on the client side');
    }

    try {
      // Use our helper to handle all the cleanup
      await logoutUser();
      
      // Always return a success value (null) even if there were internal errors
      // This ensures the Redux state gets cleared properly
      return null;
    } catch (error) {
      // Don't reject - we want the reducer to still reset the auth state
      // even if there was an error during logout
      return null;
    }
  }
);

export const resetPasswordAsync = createAsyncThunk(
  'auth/resetPassword',
  async (email: string, { rejectWithValue }) => {
    // Ensure we're on the client side
    if (typeof window === 'undefined') {
      return rejectWithValue('Password reset can only be performed on the client side');
    }

    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      return rejectWithValue('Failed to send password reset email');
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
      .addCase(loginUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.agent = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
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
      })
      .addCase(resetPasswordAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPasswordAsync.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(resetPasswordAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setAgent, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer; 