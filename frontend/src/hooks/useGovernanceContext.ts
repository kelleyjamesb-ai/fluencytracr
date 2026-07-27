import { getFrontendSessionContext } from "../auth";

export function useGovernanceContext() {
  const { orgId, role } = getFrontendSessionContext();
  // Display convenience only. Backend JWT authorization owns every operation.
  const isAdmin = role === "ADMIN";

  return { orgId, role, isAdmin };
}
