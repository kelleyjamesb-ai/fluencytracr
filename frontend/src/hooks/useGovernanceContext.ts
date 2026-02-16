export function useGovernanceContext() {
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = localStorage.getItem("role") ?? "ADMIN";
  const isAdmin = role === "ADMIN";

  return { orgId, role, isAdmin };
}

