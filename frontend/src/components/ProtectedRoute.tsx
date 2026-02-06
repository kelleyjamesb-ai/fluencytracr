import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";

type ProtectedRouteProps = {
    children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

    useEffect(() => {
        fetch("/auth/me", { credentials: "same-origin" })
            .then((res) => {
                setStatus(res.ok ? "authenticated" : "unauthenticated");
            })
            .catch(() => {
                setStatus("unauthenticated");
            });
    }, []);

    if (status === "loading") {
        return null;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}
