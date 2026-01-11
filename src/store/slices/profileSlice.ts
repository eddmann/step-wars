import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { User, Badge } from "../../types";
import * as api from "../../lib/api";

interface ProfileStats {
  total_steps: number;
  challenges_joined: number;
  challenges_won: number;
  badges_earned: number;
  today_steps: number;
}

interface ProfileState {
  user: User | null;
  stats: ProfileStats | null;
  badges: Badge[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  user: null,
  stats: null,
  badges: [],
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchProfile = createAsyncThunk(
  "profile/fetch",
  async (_, { rejectWithValue }) => {
    const response = await api.getProfile();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!;
  }
);

export const updateProfile = createAsyncThunk(
  "profile/update",
  async ({ name, email, timezone }: { name: string; email: string; timezone?: string }, { rejectWithValue }) => {
    const response = await api.updateProfile(name, email, timezone);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.user;
  }
);

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder.addCase(fetchProfile.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchProfile.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.stats = action.payload.stats;
      state.badges = action.payload.badges;
    });
    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update profile
    builder.addCase(updateProfile.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(updateProfile.fulfilled, (state, action) => {
      state.isSubmitting = false;
      state.user = action.payload;
    });
    builder.addCase(updateProfile.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = profileSlice.actions;
export default profileSlice.reducer;
