import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { StepEntry } from "../../types";
import * as api from "../../lib/api";

interface StepsState {
  entries: StepEntry[];
  isLoading: boolean;
  error: string | null;
}

const initialState: StepsState = {
  entries: [],
  isLoading: false,
  error: null,
};

export const fetchStepHistory = createAsyncThunk(
  "steps/fetchHistory",
  async (_, { rejectWithValue }) => {
    const response = await api.getSteps();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.entries;
  },
);

const stepsSlice = createSlice({
  name: "steps",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchStepHistory.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchStepHistory.fulfilled, (state, action) => {
      state.isLoading = false;
      state.entries = action.payload;
    });
    builder.addCase(fetchStepHistory.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearError } = stepsSlice.actions;
export default stepsSlice.reducer;
