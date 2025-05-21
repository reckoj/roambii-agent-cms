import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db as firestore } from "@/lib/firebase/config";
import { AgentProfile } from "@/types/agent";
import { uploadImage } from "@/lib/firebase/storage";

interface AgentProfileState {
  profile: AgentProfile | null;
  loading: boolean;
  error: string | null;
  isNewAgent: boolean;
}

const initialState: AgentProfileState = {
  profile: null,
  loading: false,
  error: null,
  isNewAgent: false,
};

// Helper function to convert Firestore data to AgentProfile
const convertToAgentProfile = (id: string, data: any): AgentProfile => {
  // Convert Firebase Timestamp to milliseconds
  const convertTimestamp = (timestamp: any) => {
    if (!timestamp) return Date.now();
    if (timestamp.seconds) {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    }
    return timestamp;
  };

  // Helper to check if a value is empty
  const isEmpty = (value: any): boolean => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  };

  // Create base profile with required fields
  const profile: AgentProfile = {
    id,
    userId: data.userId || id,
    name: data.name || "Unnamed Agent",
    email: data.email || "",
    yearsOfExperience: data.yearsOfExperience || 0,
    region: data.region || "",
    languages: data.languages || [],
    bio: data.bio || "",
    specialties: data.specialties || [],
    isProfileComplete: data.isProfileComplete || false,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  };

  // Add optional fields only if they have values
  if (!isEmpty(data.avatar)) profile.avatar = data.avatar;
  if (!isEmpty(data.phoneNumber)) profile.phoneNumber = data.phoneNumber;
  if (!isEmpty(data.website)) profile.website = data.website;
  if (!isEmpty(data.socialLinks)) profile.socialLinks = data.socialLinks;
  if (!isEmpty(data.certifications)) profile.certifications = data.certifications;
  if (!isEmpty(data.rating)) profile.rating = data.rating;
  if (!isEmpty(data.reviewCount)) profile.reviewCount = data.reviewCount;

  return profile;
};

// Get agent profile from Firestore
export const fetchAgentProfileAsync = createAsyncThunk(
  "agentProfile/fetchProfile",
  async (userId: string, { rejectWithValue }) => {
    try {
      // First try by direct ID
      const agentRef = doc(firestore, "agents", userId);
      const agentDoc = await getDoc(agentRef);

      if (agentDoc.exists()) {
        const agentData = agentDoc.data();
        const profile = convertToAgentProfile(agentDoc.id, agentData);
        return {
          ...profile,
          isNewAgent: !agentData.isProfileComplete,
        };
      }

      // Try searching by userId field
      const agentsRef = collection(firestore, "agents");
      const q = query(agentsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const agentDoc = querySnapshot.docs[0];
        const agentData = agentDoc.data();
        const profile = convertToAgentProfile(agentDoc.id, agentData);
        return {
          ...profile,
          isNewAgent: !agentData.isProfileComplete,
        };
      }

      // No agent profile found
      return rejectWithValue("Agent profile not found");
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// Update agent profile
export const updateAgentProfileAsync = createAsyncThunk(
  "agentProfile/updateProfile",
  async (
    {
      agentId,
      profileData,
      avatarFile,
    }: {
      agentId: string;
      profileData: Partial<AgentProfile>;
      avatarFile?: File;
    },
    { rejectWithValue }
  ) => {
    try {
      if (!agentId) {
        return rejectWithValue("Agent ID is required");
      }

      // First verify the agent exists
      const agentRef = doc(firestore, "agents", agentId);
      const agentDoc = await getDoc(agentRef);
      
      if (!agentDoc.exists()) {
        return rejectWithValue("Agent profile not found");
      }

      let avatarUrl: string | undefined = profileData.avatar;

      // Upload avatar if provided
      if (avatarFile) {
        try {
          const uploadedUrl = await uploadImage(`agents/${agentId}`, avatarFile);
          avatarUrl = uploadedUrl || undefined;
        } catch (error) {
          console.error("Error uploading avatar:", error);
          return rejectWithValue("Failed to upload profile image");
        }
      }

      // Sanitize and validate the update data
      const sanitizedData: Partial<AgentProfile> = {};
      
      // Only include fields that are actually being updated and have values
      Object.entries(profileData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          sanitizedData[key as keyof AgentProfile] = value;
        }
      });

      // Prepare update data
      const updateData = {
        ...sanitizedData,
        avatar: avatarUrl,
        updatedAt: serverTimestamp(),
      };

      // Remove any undefined or null values to prevent Firestore errors
      Object.keys(updateData).forEach(key => {
        const value = updateData[key as keyof typeof updateData];
        if (value === undefined || value === null || value === "") {
          delete updateData[key as keyof typeof updateData];
        }
      });

      // Update agent document
      await updateDoc(agentRef, updateData);

      // Also update the user document if name or avatar is being updated
      if (updateData.name || updateData.avatar) {
        const userRef = doc(firestore, "users", agentId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userUpdates: any = {};
          if (updateData.name) userUpdates.name = updateData.name;
          if (updateData.avatar) userUpdates.avatar = updateData.avatar;
          userUpdates.updatedAt = serverTimestamp();
          
          await updateDoc(userRef, userUpdates);
        }
      }

      // Fetch and return the updated profile
      const updatedDoc = await getDoc(agentRef);
      if (!updatedDoc.exists()) {
        return rejectWithValue("Failed to fetch updated profile");
      }

      const updatedData = updatedDoc.data();
      const profile = convertToAgentProfile(agentId, updatedData);

      return {
        ...profile,
        isNewAgent: false,
      };
    } catch (error: any) {
      console.error("Error updating agent profile:", error);
      return rejectWithValue(error.message || "Failed to update agent profile");
    }
  }
);

const agentProfileSlice = createSlice({
  name: "agentProfile",
  initialState,
  reducers: {
    clearAgentProfileError: (state) => {
      state.error = null;
    },
    setIsNewAgent: (state, action) => {
      state.isNewAgent = action.payload;
    },
    resetAgentProfile: (state) => {
      state.profile = null;
      state.loading = false;
      state.error = null;
      state.isNewAgent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile cases
      .addCase(fetchAgentProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.isNewAgent = action.payload.isNewAgent;
      })
      .addCase(fetchAgentProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update profile cases
      .addCase(updateAgentProfileAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAgentProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateAgentProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAgentProfileError, setIsNewAgent, resetAgentProfile } =
  agentProfileSlice.actions;
export default agentProfileSlice.reducer; 