import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

const Home = lazy(() => import("@/pages/Home"));
const Ask = lazy(() => import("@/pages/Ask"));
const IndexPage = lazy(() => import("@/pages/Index"));
const Graph = lazy(() => import("@/pages/Graph"));
const Health = lazy(() => import("@/pages/Health"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/**
 * The backend currently exposes every /api/v1/** endpoint publicly (no JWT / OAuth2),
 * so there is intentionally no login or guarded route here. When the backend adds auth,
 * wrap <AppShell /> in a guard and attach the token in src/api/client.ts.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Home />} />
        <Route path="ask" element={<Ask />} />
        <Route path="index" element={<IndexPage />} />
        <Route path="graph" element={<Graph />} />
        <Route path="health" element={<Health />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
