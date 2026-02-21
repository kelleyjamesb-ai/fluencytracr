import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { AUTH_TOKEN_STORAGE_KEY } from "../auth";

type ProtectedRouteProps = {
    children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const requireAuth = (import.meta.env.VITE_REQUIRE_AUTH ?? "false").trim() === "true";
    if (!requireAuth) {
        return <>{children}</>;
    }
    const hasSessionFlag = localStorage.getItem("isAuthenticated") === "true";
    const hasToken = Boolean(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)?.trim());
    const isAuthenticated = hasSessionFlag || hasToken;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
