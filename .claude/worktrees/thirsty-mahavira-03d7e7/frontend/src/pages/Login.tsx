import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_TOKEN_STORAGE_KEY } from "../auth";

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@fluencytracr.com");
  const [orgId, setOrgId] = useState(localStorage.getItem("orgId") ?? "org-1");
  const [role, setRole] = useState(localStorage.getItem("role") ?? "ADMIN");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orgId.trim()) {
      setError("Organization ID is required.");
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userEmail", email.trim());
      localStorage.setItem("orgId", orgId.trim());
      localStorage.setItem("role", role);
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
        <p className="meta">Sign in to access policy mapping and shadow-mode compliance controls.</p>
        <form onSubmit={onSubmit} className="auth-form">
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
          {error && <p className="error-text">{error}</p>}
          <button className="primary" type="submit" disabled={isSigningIn}>
            {isSigningIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
};
