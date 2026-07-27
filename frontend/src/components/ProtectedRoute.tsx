import { ReactNode, useSyncExternalStore } from "react";
import { Navigate } from "react-router-dom";
import {
    getAuthSessionSnapshot,
    getStoredAuthToken,
    isFrontendAuthRequired,
    subscribeToAuthSession
} from "../auth";

type ProtectedRouteProps = {
    children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    useSyncExternalStore(
        subscribeToAuthSession,
        getAuthSessionSnapshot,
        getAuthSessionSnapshot
    );
    const requireAuth = isFrontendAuthRequired();
    if (!requireAuth) {
        return <>{children}</>;
    }
    if (!getStoredAuthToken()) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
