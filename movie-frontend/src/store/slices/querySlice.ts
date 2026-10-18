import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/api/endpoints";
import type { QueryMode, QueryResponse } from "@/api/types";
import { errorMessage } from "@/lib/errors";
import { readJson } from "@/lib/storage";

export const HISTORY_KEY = "cinegraph.history.v1";
const MAX_ITEMS = 50;

export interface QueryHistoryItem {
  id: string;
  query: string;
  mode: QueryMode;
  createdAt: number;
  status: "pending" | "done" | "error";
  response?: QueryResponse;
  error?: string;
}

interface QueryState {
  items: QueryHistoryItem[];
}

function loadHistory(): QueryHistoryItem[] {
  const stored = readJson<QueryHistoryItem[]>(HISTORY_KEY, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((i) => i && typeof i.id === "string" && i.status !== "pending").slice(0, MAX_ITEMS);
}

const initialState: QueryState = { items: loadHistory() };

export const askQuestion = createAsyncThunk<
  QueryResponse,
  { query: string; mode: QueryMode },
  { rejectValue: string }
>("query/ask", async ({ query, mode }, { rejectWithValue, signal }) => {
  try {
    return await api.ask(mode, query, signal);
  } catch (err) {
    return rejectWithValue(errorMessage(err));
  }
});

const querySlice = createSlice({
  name: "query",
  initialState,
  reducers: {
    clearHistory(state) {
      state.items = state.items.filter((i) => i.status === "pending");
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askQuestion.pending, (state, action) => {
        state.items.unshift({
          id: action.meta.requestId,
          query: action.meta.arg.query,
          mode: action.meta.arg.mode,
          createdAt: Date.now(),
          status: "pending",
        });
        state.items = state.items.slice(0, MAX_ITEMS);
      })
      .addCase(askQuestion.fulfilled, (state, action) => {
        const item = state.items.find((i) => i.id === action.meta.requestId);
        if (item) {
          item.status = "done";
          item.response = action.payload;
        }
      })
      .addCase(askQuestion.rejected, (state, action) => {
        const item = state.items.find((i) => i.id === action.meta.requestId);
        if (item) {
          item.status = "error";
          item.error = action.payload ?? action.error.message ?? "Request failed.";
        }
      });
  },
});

export const { clearHistory, removeItem } = querySlice.actions;
export default querySlice.reducer;
