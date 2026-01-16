import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  Challenge,
  ChallengeWithParticipants,
  LeaderboardEntry,
  CreateChallengeForm,
} from "../../types";
import * as api from "../../lib/api";

interface ChallengesState {
  challenges: (Challenge & { participant_count: number })[];
  currentChallenge: ChallengeWithParticipants | null;
  leaderboard: LeaderboardEntry[];
  lastFinalizedDate: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

const initialState: ChallengesState = {
  challenges: [],
  currentChallenge: null,
  leaderboard: [],
  lastFinalizedDate: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
};

export const fetchChallenges = createAsyncThunk(
  "challenges/fetchAll",
  async (_, { rejectWithValue }) => {
    const response = await api.getChallenges();
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.challenges;
  }
);

export const fetchChallenge = createAsyncThunk(
  "challenges/fetchOne",
  async (id: number, { rejectWithValue }) => {
    const response = await api.getChallenge(id);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!;
  }
);

export const createChallenge = createAsyncThunk(
  "challenges/create",
  async (data: CreateChallengeForm, { rejectWithValue }) => {
    const response = await api.createChallenge(data);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.challenge;
  }
);

export const joinChallenge = createAsyncThunk(
  "challenges/join",
  async (inviteCode: string, { rejectWithValue }) => {
    const response = await api.joinChallenge(inviteCode);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!.challenge;
  }
);

export const fetchLeaderboard = createAsyncThunk(
  "challenges/fetchLeaderboard",
  async (challengeId: number, { rejectWithValue }) => {
    const response = await api.getLeaderboard(challengeId);
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data!;
  }
);

const challengesSlice = createSlice({
  name: "challenges",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentChallenge: (state) => {
      state.currentChallenge = null;
      state.leaderboard = [];
    },
  },
  extraReducers: (builder) => {
    // Fetch all challenges
    builder.addCase(fetchChallenges.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchChallenges.fulfilled, (state, action) => {
      state.isLoading = false;
      state.challenges = action.payload;
    });
    builder.addCase(fetchChallenges.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch single challenge
    builder.addCase(fetchChallenge.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchChallenge.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentChallenge = {
        ...action.payload.challenge,
        participants: action.payload.participants,
        participant_count: action.payload.participant_count,
      };
    });
    builder.addCase(fetchChallenge.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create challenge
    builder.addCase(createChallenge.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(createChallenge.fulfilled, (state, action) => {
      state.isSubmitting = false;
      state.challenges.unshift({ ...action.payload, participant_count: 1 });
    });
    builder.addCase(createChallenge.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Join challenge
    builder.addCase(joinChallenge.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(joinChallenge.fulfilled, (state, action) => {
      state.isSubmitting = false;
      // Add to challenges list if not already there
      const exists = state.challenges.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.challenges.unshift({ ...action.payload, participant_count: 1 });
      }
    });
    builder.addCase(joinChallenge.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string;
    });

    // Fetch leaderboard
    builder.addCase(fetchLeaderboard.fulfilled, (state, action) => {
      state.leaderboard = action.payload.leaderboard;
      state.lastFinalizedDate = action.payload.last_finalized_date || null;
    });
  },
});

export const { clearError, clearCurrentChallenge } = challengesSlice.actions;
export default challengesSlice.reducer;
