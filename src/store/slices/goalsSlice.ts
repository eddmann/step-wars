import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { UserGoals } from "../../types";
import * as api from "../../lib/api";

interface GoalsState {
  goals: UserGoals | null;
  todaySteps: number;
  weeklySteps: number;
  dailyProgress: number;
  weeklyProgress: number;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: GoalsState = {
  goals: null,
  todaySteps: 0,
  weeklySteps: 0,
  dailyProgress: 0,
  weeklyProgress: 0,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchGoals = createAsyncThunk(
  "goals/fetch",
  async (_, { rejectWithValue }) => {
    const response = await api.getGoals();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!;
  }
);

export const updateGoals = createAsyncThunk(
  "goals/update",
  async (
    { dailyTarget, weeklyTarget }: { dailyTarget: number; weeklyTarget: number },
    { rejectWithValue }
  ) => {
    const response = await api.updateGoals(dailyTarget, weeklyTarget);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  }
);

export const pauseGoals = createAsyncThunk(
  "goals/pause",
  async (_, { rejectWithValue }) => {
    const response = await api.pauseGoals();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  }
);

export const resumeGoals = createAsyncThunk(
  "goals/resume",
  async (_, { rejectWithValue }) => {
    const response = await api.resumeGoals();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  }
);

const goalsSlice = createSlice({
  name: "goals",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch goals
    builder.addCase(fetchGoals.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchGoals.fulfilled, (state, action) => {
      state.isLoading = false;
      state.goals = action.payload.goals;
      state.todaySteps = action.payload.today_steps;
      state.weeklySteps = action.payload.weekly_steps;
      state.dailyProgress = action.payload.daily_progress;
      state.weeklyProgress = action.payload.weekly_progress;
    });
    builder.addCase(fetchGoals.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update goals
    builder.addCase(updateGoals.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(updateGoals.fulfilled, (state, action) => {
      state.isSubmitting = false;
      state.goals = action.payload;
      // Recalculate progress
      if (state.goals) {
        state.dailyProgress = Math.min(
          100,
          Math.round((state.todaySteps / state.goals.daily_target) * 100)
        );
        state.weeklyProgress = Math.min(
          100,
          Math.round((state.weeklySteps / state.goals.weekly_target) * 100)
        );
      }
    });
    builder.addCase(updateGoals.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Pause goals
    builder.addCase(pauseGoals.fulfilled, (state, action) => {
      state.goals = action.payload;
    });

    // Resume goals
    builder.addCase(resumeGoals.fulfilled, (state, action) => {
      state.goals = action.payload;
    });
  },
});

export const { clearError } = goalsSlice.actions;
export default goalsSlice.reducer;
