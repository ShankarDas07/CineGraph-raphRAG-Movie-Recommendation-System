import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "@/api/endpoints";
import type { ExtractedMovie, IndexMoviesResult, IndexStatus } from "@/api/types";
import { errorMessage } from "@/lib/errors";

type Submitting = "pdf" | "json" | "movies" | null;

interface IndexState {
  status: IndexStatus | null;
  statusError: string | null;
  submitting: Submitting;
  moviesResult: IndexMoviesResult | null;
}

const initialState: IndexState = { status: null, statusError: null, submitting: null, moviesResult: null };

const cfg = {} as { rejectValue: string };

export const fetchIndexStatus = createAsyncThunk<IndexStatus, void, { rejectValue: string }>(
  "index/status",
  async (_arg, { rejectWithValue, signal }) => {
    try {
      return await api.indexStatus(signal);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const startPdfIndexing = createAsyncThunk<IndexStatus, File, typeof cfg>(
  "index/pdf",
  async (file, { rejectWithValue }) => {
    try {
      return await api.indexPdf(file);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const startJsonIndexing = createAsyncThunk<IndexStatus, { graph: boolean; vectors: boolean }, typeof cfg>(
  "index/json",
  async ({ graph, vectors }, { rejectWithValue }) => {
    try {
      return await api.indexJson(graph, vectors);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const submitMovies = createAsyncThunk<IndexMoviesResult, ExtractedMovie[], typeof cfg>(
  "index/movies",
  async (movies, { rejectWithValue }) => {
    try {
      return await api.indexMovies(movies);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

const indexSlice = createSlice({
  name: "index",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchIndexStatus.fulfilled, (state, action) => {
        state.status = action.payload;
        state.statusError = null;
      })
      .addCase(fetchIndexStatus.rejected, (state, action) => {
        if (action.meta.aborted) return;
        state.statusError = action.payload ?? action.error.message ?? "Could not load indexing status.";
      })
      .addCase(startPdfIndexing.pending, (state) => {
        state.submitting = "pdf";
      })
      .addCase(startPdfIndexing.fulfilled, (state, action) => {
        state.submitting = null;
        state.status = action.payload;
        state.statusError = null;
      })
      .addCase(startPdfIndexing.rejected, (state) => {
        state.submitting = null;
      })
      .addCase(startJsonIndexing.pending, (state) => {
        state.submitting = "json";
      })
      .addCase(startJsonIndexing.fulfilled, (state, action) => {
        state.submitting = null;
        state.status = action.payload;
        state.statusError = null;
      })
      .addCase(startJsonIndexing.rejected, (state) => {
        state.submitting = null;
      })
      .addCase(submitMovies.pending, (state) => {
        state.submitting = "movies";
      })
      .addCase(submitMovies.fulfilled, (state, action) => {
        state.submitting = null;
        state.moviesResult = action.payload;
      })
      .addCase(submitMovies.rejected, (state) => {
        state.submitting = null;
      });
  },
});

export default indexSlice.reducer;
