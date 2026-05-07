export function useGovernanceContext() {
  const requireAuth = (import.meta.env.VITE_REQUIRE_AUTH ?? "false").trim() === "true";
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = requireAuth ? (localStorage.getItem("role") ?? "ADMIN") : "ADMIN";
  const isAdmin = role === "ADMIN";

  return { orgId, role, isAdmin };
}
