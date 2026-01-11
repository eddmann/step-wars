import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import authReducer from "./slices/authSlice";
import challengesReducer from "./slices/challengesSlice";
import goalsReducer from "./slices/goalsSlice";
import profileReducer from "./slices/profileSlice";
import stepsReducer from "./slices/stepsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    challenges: challengesReducer,
    goals: goalsReducer,
    profile: profileReducer,
    steps: stepsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
