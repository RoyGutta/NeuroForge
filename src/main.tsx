import React, { Suspense, lazy, useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TechnologyPage } from "./pages/TechnologyPage";
import { WorkspacePage } from "./pages/WorkspacePage";

/** Benchmark records are bundled with this page only, so they load on demand. */
const BenchmarksPage = lazy(() => import("./pages/BenchmarksPage").then((m) => ({ default: m.BenchmarksPage })));

/** The legacy site was four separate documents, so every navigation landed at
 *  the top of the page. Reproduce that on SPA route changes (hash links like
 *  #architecture keep their native in-page behavior). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/technology" element={<TechnologyPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route
          path="/benchmarks"
          element={
            <Suspense fallback={null}>
              <BenchmarksPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
