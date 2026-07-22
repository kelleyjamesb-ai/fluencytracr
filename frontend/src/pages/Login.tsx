import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  applyAuthToken,
  applyLocalExampleSession,
  isFrontendAuthRequired
} from "../auth";

type SignInMethod = "google" | "microsoft" | "email";

const GoogleMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
    <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.2a10 10 0 0 0 0 9.2L6.5 14Z" />
    <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.5l3.3 2.6A5.8 5.8 0 0 1 12 6Z" />
  </svg>
);

const MicrosoftMark = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path fill="#F25022" d="M2 2h9v9H2z" />
    <path fill="#7FBA00" d="M13 2h9v9h-9z" />
    <path fill="#00A4EF" d="M2 13h9v9H2z" />
    <path fill="#FFB900" d="M13 13h9v9h-9z" />
  </svg>
);

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem("userEmail") ?? "");
  const [orgId, setOrgId] = useState(localStorage.getItem("orgId") ?? "org-1");
  const [role, setRole] = useState(localStorage.getItem("role") ?? "ADMIN");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signingInWith, setSigningInWith] = useState<SignInMethod | null>(null);
  const requireAuth = isFrontendAuthRequired();

  const onProvisionedTokenSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken.trim()) {
      setError("A provisioned access token is required.");
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      applyAuthToken(accessToken);
      navigate("/", { replace: true });
    } catch {
      setError("Unable to sign in.");
      setIsSigningIn(false);
    }
  };

  const completeMockSignIn = (method: SignInMethod) => {
    if (requireAuth) {
      setError("A provisioned access token is required.");
      return;
    }
    if (!orgId.trim()) {
      setError("Organization ID is required in wireframe settings.");
      return;
    }

    const sessionEmail =
      email.trim() ||
      (method === "google"
        ? "google.user@company.com"
        : method === "microsoft"
          ? "microsoft.user@company.com"
          : "");

    if (!sessionEmail) {
      setError("Enter your work email to continue.");
      return;
    }

    setError(null);
    setSigningInWith(method);
    try {
      applyLocalExampleSession({ email: sessionEmail, orgId, role });
      localStorage.setItem("authProvider", method);
      navigate("/ai-value-workspace", { replace: true });
    } catch {
      setError("Unable to create the mock session.");
      setSigningInWith(null);
    }
  };

  const onEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    completeMockSignIn("email");
  };

  if (requireAuth) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="eyebrow">Internal Admin Beta</p>
          <h1>FluencyTracr</h1>
          <p className="meta">
            Continue with a provisioned bearer token. Organization and role come only
            from its verified claims.
          </p>
          <form onSubmit={onProvisionedTokenSubmit} className="auth-form">
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
            {error && <p className="error-text">{error}</p>}
            <button className="primary" type="submit" disabled={isSigningIn}>
              {isSigningIn ? "Continuing..." : "Continue"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Product introduction">
        <a className="auth-brand" href="/ai-value-workspace" aria-label="FluencyTracr home">
          <span>FT</span>
          <strong>FluencyTracr</strong>
        </a>
        <div>
          <p className="eyebrow">AI Value Platform</p>
          <h1>Turn AI activity into a value case leaders can trust.</h1>
          <p>
            Bring customer hypotheses, aggregate evidence, outcome metrics, and decisions
            into one governed workspace.
          </p>
        </div>
        <p className="auth-boundary">
          Aggregate evidence only. No individual scoring, productivity claims, or automatic ROI proof.
        </p>
      </section>

      <section className="auth-card" aria-labelledby="sign-in-title">
        <div className="auth-card-head">
          <p className="eyebrow">Welcome</p>
          <h2 id="sign-in-title">Sign in to your workspace</h2>
          <p>Use your organization account or continue with your work email.</p>
        </div>

        <div className="auth-sso-actions" aria-label="Single sign-on options">
          <button
            type="button"
            onClick={() => completeMockSignIn("google")}
            disabled={signingInWith !== null}
          >
            <GoogleMark />
            <span>{signingInWith === "google" ? "Connecting…" : "Continue with Google"}</span>
          </button>
          <button
            type="button"
            onClick={() => completeMockSignIn("microsoft")}
            disabled={signingInWith !== null}
          >
            <MicrosoftMark />
            <span>{signingInWith === "microsoft" ? "Connecting…" : "Continue with Microsoft"}</span>
          </button>
        </div>

        <div className="auth-divider"><span>or continue with email</span></div>

        <form onSubmit={onEmailSubmit} className="auth-form">
          <label htmlFor="login-email">Work email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            autoComplete="email"
            aria-describedby={error ? "login-error" : undefined}
            required
          />
          <button className="auth-email-action" type="submit" disabled={signingInWith !== null}>
            {signingInWith === "email" ? "Continuing…" : "Continue with email"}
          </button>
        </form>

        {error && <p id="login-error" role="alert" className="error-text">{error}</p>}

        <details className="auth-wireframe-settings">
          <summary>Wireframe workspace settings</summary>
          <div>
            <label htmlFor="login-org">Organization ID</label>
            <input
              id="login-org"
              type="text"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
            />
            <label htmlFor="login-role">Demo role</label>
            <select id="login-role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="ADMIN">Admin</option>
              <option value="EXEC_VIEWER">Executive viewer</option>
              <option value="ENABLEMENT_LEAD">Enablement lead</option>
            </select>
          </div>
        </details>

        <p className="auth-mock-note">
          Wireframe only — no external identity provider is contacted.
        </p>
      </section>
    </main>
  );
};
