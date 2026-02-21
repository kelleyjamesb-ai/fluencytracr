import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_TOKEN_STORAGE_KEY } from "../auth";
import { ProtectedRoute } from "./ProtectedRoute";

const renderWithRoutes = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>protected-content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login-page</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("ProtectedRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("renders children when auth is not required", () => {
    renderWithRoutes();

    expect(screen.getByText("protected-content")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
  });

  it("redirects to login when auth is required and no session exists", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    renderWithRoutes();

    expect(screen.getByText("login-page")).toBeInTheDocument();
    expect(screen.queryByText("protected-content")).not.toBeInTheDocument();
  });

  it("renders children when session flag is true", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    localStorage.setItem("isAuthenticated", "true");

    renderWithRoutes();

    expect(screen.getByText("protected-content")).toBeInTheDocument();
  });

  it("renders children when bearer token exists", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, " token-value ");

    renderWithRoutes();

    expect(screen.getByText("protected-content")).toBeInTheDocument();
    expect(screen.queryByText("login-page")).not.toBeInTheDocument();
  });
});
