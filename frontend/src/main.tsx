import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Dashboard } from "./pages/Dashboard";
import { AIValueWorkspace } from "./pages/AIValueWorkspace";
import { AIValueDiscovery } from "./pages/AIValueDiscovery";
import { AIValueJourney } from "./pages/AIValueJourney";
import { GovernanceConcept } from "./pages/GovernanceConcept";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import "./styles.css";

const MethodologyReviewWorkspace = lazy(() =>
  import("./pages/MethodologyReviewWorkspace").then((module) => ({
    default: module.MethodologyReviewWorkspace
  }))
);

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <GovernanceConcept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <GovernanceConcept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/governance"
          element={
            <ProtectedRoute>
              <GovernanceConcept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-value-workspace"
          element={
            <ProtectedRoute>
              <AIValueWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-value"
          element={
            <ProtectedRoute>
              <AIValueJourney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-value-journey"
          element={
            <ProtectedRoute>
              <AIValueJourney />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai-value-discovery"
          element={
            <ProtectedRoute>
              <AIValueDiscovery />
            </ProtectedRoute>
          }
        />
        <Route
          path="/methodology-review"
          element={
            <ProtectedRoute>
              <Suspense fallback={<main className="main">Loading workspace...</main>}>
                <MethodologyReviewWorkspace />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/legacy-dashboard"
          element={
            <ProtectedRoute>
              <GovernanceConcept />
            </ProtectedRoute>
          }
        />
        <Route
          path="/legacy-dashboard"
          element={<Navigate to="/governance" replace />}
        />
        <Route
          path="/old-dashboard"
          element={<Navigate to="/governance" replace />}
        />
        <Route path="/legacy-dashboard-view" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
    <SpeedInsights />
  </React.StrictMode>
);
