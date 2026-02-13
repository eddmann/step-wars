import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { UserGoals, PendingNotification } from "../../types";
import * as api from "../../lib/api";
import { initHealthKit, queryStepsForDate } from "../../lib/pwakit";
import { getToday, getYesterday, canEditDate } from "../../lib/utils";

interface GoalsState {
  goals: UserGoals | null;
  todaySteps: number;
  weeklySteps: number;
  dailyProgress: number;
  weeklyProgress: number;
  notifications: PendingNotification[];
  isLoading: boolean;
  isSubmitting: boolean;
  isSyncing: boolean;
  error: string | null;
}

const initialState: GoalsState = {
  goals: null,
  todaySteps: 0,
  weeklySteps: 0,
  dailyProgress: 0,
  weeklyProgress: 0,
  notifications: [],
  isLoading: false,
  isSubmitting: false,
  isSyncing: false,
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
  },
);

export const updateGoals = createAsyncThunk(
  "goals/update",
  async (
    {
      dailyTarget,
      weeklyTarget,
    }: { dailyTarget: number; weeklyTarget: number },
    { rejectWithValue },
  ) => {
    const response = await api.updateGoals(dailyTarget, weeklyTarget);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  },
);

export const pauseGoals = createAsyncThunk(
  "goals/pause",
  async (_, { rejectWithValue }) => {
    const response = await api.pauseGoals();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  },
);

export const resumeGoals = createAsyncThunk(
  "goals/resume",
  async (_, { rejectWithValue }) => {
    const response = await api.resumeGoals();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.goals;
  },
);

export const submitSteps = createAsyncThunk(
  "goals/submitSteps",
  async (
    {
      date,
      stepCount,
      source = "manual",
    }: { date: string; stepCount: number; source?: string },
    { rejectWithValue, dispatch },
  ) => {
    const response = await api.submitSteps(date, stepCount, source);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    // Refresh goals to update todaySteps
    dispatch(fetchGoals());
    return response.data!.entry;
  },
);

export const syncHealthKit = createAsyncThunk(
  "goals/syncHealthKit",
  async (_, { dispatch }) => {
    const authorized = await initHealthKit();
    if (!authorized) return { totalSynced: 0 };

    const today = getToday();
    const yesterday = getYesterday();
    const datesToSync = [today, ...(canEditDate(yesterday) ? [yesterday] : [])];

    let totalSynced = 0;
    for (const date of datesToSync) {
      const steps = await queryStepsForDate(date);
      if (steps > 0) {
        const result = await dispatch(
          submitSteps({ date, stepCount: steps, source: "healthkit" }),
        );
        if (submitSteps.fulfilled.match(result)) {
          totalSynced += steps;
        }
      }
    }

    return { totalSynced };
  },
);

export const markNotificationsAsRead = createAsyncThunk(
  "goals/markNotificationsAsRead",
  async (notificationIds: number[], { rejectWithValue }) => {
    const response = await api.markNotificationsAsRead(notificationIds);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return notificationIds;
  },
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
      state.notifications = action.payload.notifications || [];
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
          Math.round((state.todaySteps / state.goals.daily_target) * 100),
        );
        state.weeklyProgress = Math.min(
          100,
          Math.round((state.weeklySteps / state.goals.weekly_target) * 100),
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

    // Submit steps
    builder.addCase(submitSteps.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitSteps.fulfilled, (state) => {
      state.isSubmitting = false;
    });
    builder.addCase(submitSteps.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Sync HealthKit
    builder.addCase(syncHealthKit.pending, (state) => {
      state.isSyncing = true;
    });
    builder.addCase(syncHealthKit.fulfilled, (state) => {
      state.isSyncing = false;
    });
    builder.addCase(syncHealthKit.rejected, (state) => {
      state.isSyncing = false;
    });

    // Mark notifications as read
    builder.addCase(markNotificationsAsRead.fulfilled, (state, action) => {
      const readIds = new Set(action.payload);
      state.notifications = state.notifications.filter(
        (n) => !readIds.has(n.id),
      );
    });
  },
});

export const { clearError } = goalsSlice.actions;
export default goalsSlice.reducer;
