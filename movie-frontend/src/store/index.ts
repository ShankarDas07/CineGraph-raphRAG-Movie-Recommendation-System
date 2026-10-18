import { configureStore } from "@reduxjs/toolkit";
import { writeJson } from "@/lib/storage";
import indexReducer from "./slices/indexSlice";
import queryReducer, { HISTORY_KEY, type QueryHistoryItem } from "./slices/querySlice";
import systemReducer from "./slices/systemSlice";

export const store = configureStore({
  reducer: {
    query: queryReducer,
    index: indexReducer,
    system: systemReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Persist finished questions (without the bulky debug rows) so history survives reloads.
let lastItems: QueryHistoryItem[] | null = null;
store.subscribe(() => {
  const items = store.getState().query.items;
  if (items === lastItems) return;
  lastItems = items;
  const slim = items
    .filter((i) => i.status !== "pending")
    .map((i) => (i.response ? { ...i, response: { ...i.response, debug: null } } : i));
  writeJson(HISTORY_KEY, slim);
});
