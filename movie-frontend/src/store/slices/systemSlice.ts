import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/api/endpoints";
import type { ConnectionStatus, GraphStats } from "@/api/types";
import { errorMessage } from "@/lib/errors";

export interface Remote<T> {
  data: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  fetchedAt: number | null;
}

interface SystemState {
  health: Remote<ConnectionStatus>;
  graph: Remote<GraphStats>;
}

const empty = <T,>(): Remote<T> => ({ data: null, status: "idle", error: null, fetchedAt: null });

const initialState: SystemState = { health: empty<ConnectionStatus>(), graph: empty<GraphStats>() };

export const fetchHealth = createAsyncThunk<ConnectionStatus, void, { rejectValue: string }>(
  "system/health",
  async (_arg, { rejectWithValue, signal }) => {
    try {
      return await api.health(signal);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const fetchGraphStats = createAsyncThunk<GraphStats, void, { rejectValue: string }>(
  "system/graph",
  async (_arg, { rejectWithValue, signal }) => {
    try {
      return await api.graphStats(signal);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

const systemSlice = createSlice({
  name: "system",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHealth.pending, (state) => {
        state.health.status = "loading";
        state.health.error = null;
      })
      .addCase(fetchHealth.fulfilled, (state, action) => {
        state.health = { data: action.payload, status: "succeeded", error: null, fetchedAt: Date.now() };
      })
      .addCase(fetchHealth.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.health.status = "failed";
        state.health.error = action.payload ?? action.error.message ?? "Health check failed.";
      })
      .addCase(fetchGraphStats.pending, (state) => {
        state.graph.status = "loading";
        state.graph.error = null;
      })
      .addCase(fetchGraphStats.fulfilled, (state, action) => {
        state.graph = { data: action.payload, status: "succeeded", error: null, fetchedAt: Date.now() };
      })
      .addCase(fetchGraphStats.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.graph.status = "failed";
        state.graph.error = action.payload ?? action.error.message ?? "Could not load graph stats.";
      });
  },
});

export default systemSlice.reducer;
