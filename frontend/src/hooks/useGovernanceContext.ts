export function useGovernanceContext() {
  const orgId = localStorage.getItem("orgId") ?? "org-1";
  const role = localStorage.getItem("role") ?? "ADMIN";
  const isAdmin = role === "ADMIN";
  const isExecViewer = role === "EXEC_VIEWER";
  const isEnablementLead = role === "ENABLEMENT_LEAD";

  return { orgId, role, isAdmin, isExecViewer, isEnablementLead };
}

