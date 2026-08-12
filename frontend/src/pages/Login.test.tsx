import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTH_TOKEN_STORAGE_KEY } from "../auth";
import { Login } from "./Login";

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>authenticated-home</div>} />
        <Route path="/ai-value-workspace" element={<div>workspace-home</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("Login", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it("accepts only a provisioned bearer token when auth is required", () => {
    vi.stubEnv("VITE_REQUIRE_AUTH", "true");
    renderLogin();

    expect(screen.queryByLabelText(/Organization ID/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Role/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Access token/i), {
      target: { value: "provisioned-token" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe("provisioned-token");
    expect(screen.getByText("authenticated-home")).toBeInTheDocument();
  });

  it("keeps org and role selection explicitly local-example-only", () => {
    renderLogin();

    expect(screen.getByLabelText(/Organization ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Demo role/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Access token/i)).not.toBeInTheDocument();
  });

  it("presents Google, Microsoft, and email as the three sign-in paths", () => {
    renderLogin();

    const sso = screen.getByLabelText(/Single sign-on options/i);
    expect(within(sso).getByRole("button", { name: /Continue with Google/i })).toBeInTheDocument();
    expect(within(sso).getByRole("button", { name: /Continue with Microsoft/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /Work email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue with email/i })).toBeInTheDocument();
    expect(screen.getByText(/Wireframe only — no external identity provider is contacted/i)).toBeInTheDocument();
  });

  it("creates a local Google mock session and opens the AI Value Workspace", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: /Continue with Google/i }));

    expect(screen.getByText("workspace-home")).toBeInTheDocument();
    expect(localStorage.getItem("isAuthenticated")).toBeNull();
    expect(localStorage.getItem("authProvider")).toBe("google");
    expect(localStorage.getItem("userEmail")).toBe("google.user@company.com");
  });

  it("uses the entered work email for the email mock session", () => {
    renderLogin();

    fireEvent.change(screen.getByRole("textbox", { name: /Work email/i }), {
      target: { value: "owner@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Continue with email/i }));

    expect(screen.getByText("workspace-home")).toBeInTheDocument();
    expect(localStorage.getItem("authProvider")).toBe("email");
    expect(localStorage.getItem("userEmail")).toBe("owner@example.com");
  });
});
