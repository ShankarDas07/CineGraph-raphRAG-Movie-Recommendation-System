import { useEffect } from "react";
import { fetchIndexStatus } from "@/store/slices/indexSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/** Loads the indexing job status once, then polls every `intervalMs` while the job is RUNNING. */
export function useIndexStatusPolling(intervalMs = 2000): void {
  const dispatch = useAppDispatch();
  const state = useAppSelector((s) => s.index.status?.state);

  useEffect(() => {
    void dispatch(fetchIndexStatus());
  }, [dispatch]);

  useEffect(() => {
    if (state !== "RUNNING") return;
    const id = window.setInterval(() => {
      void dispatch(fetchIndexStatus());
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [state, dispatch, intervalMs]);
}
