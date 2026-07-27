import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyAuthToken,
  applyLocalExampleSession,
  isFrontendAuthRequired
} from "../auth";

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@fluencytracr.com");
  const [orgId, setOrgId] = useState(localStorage.getItem("orgId") ?? "org-1");
  const [role, setRole] = useState(localStorage.getItem("role") ?? "ADMIN");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const requireAuth = isFrontendAuthRequired();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requireAuth && !accessToken.trim()) {
      setError("A provisioned access token is required.");
      return;
    }
    if (!requireAuth && !orgId.trim()) {
      setError("Organization ID is required.");
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      if (requireAuth) {
        applyAuthToken(accessToken);
      } else {
        applyLocalExampleSession({
          email,
          orgId,
          role
        });
      }
      navigate("/", { replace: true });
    } catch {
      setError("Unable to sign in.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Internal Admin Beta</p>
        <h1>FluencyTracr</h1>
        <p className="meta">
          {requireAuth
            ? "Continue with a provisioned bearer token. Organization and role come only from its verified claims."
            : "Local example mode only. Organization and role selections are unverified development context."}
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          {requireAuth ? (
            <label>
              Access token
              <input
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                required
              />
            </label>
          ) : (
            <>
              <label>
                Work Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Organization ID
                <input
                  type="text"
                  value={orgId}
                  onChange={(event) => setOrgId(event.target.value)}
                  required
                />
              </label>
              <label>
                Role
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="EXEC_VIEWER">EXEC_VIEWER</option>
                  <option value="ENABLEMENT_LEAD">ENABLEMENT_LEAD</option>
                </select>
              </label>
            </>
          )}
          {error && <p className="error-text">{error}</p>}
          <button className="primary" type="submit" disabled={isSigningIn}>
            {isSigningIn ? "Continuing..." : requireAuth ? "Continue" : "Open local example"}
          </button>
        </form>
      </section>
    </main>
  );
};
