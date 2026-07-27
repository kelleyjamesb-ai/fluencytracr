import { fireEvent, render, screen } from "@testing-library/react";
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
      </Routes>
    </MemoryRouter>
  );

describe("Login auth containment", () => {
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

    expect(screen.getAllByText(/local example/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Organization ID/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Access token/i)).not.toBeInTheDocument();
  });
});
