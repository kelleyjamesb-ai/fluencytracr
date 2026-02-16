import { useEffect, useState } from "react";
import { governanceApi } from "../lib/governanceApi";
import { useGovernanceContext } from "./useGovernanceContext";
import type { MappingResponse, PolicySummary } from "../types/governance";

export function useGovernanceDocumentWorkspace() {
  const { orgId, role, isAdmin } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  const [policyFileName, setPolicyFileName] = useState("governance-policy.txt");
  const [policyContent, setPolicyContent] = useState("");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapping, setIsMapping] = useState(false);

  const ctx = { orgId, role };

  const loadPolicies = async () => {
    const payload = await governanceApi.listPolicies(ctx);
    setPolicies(payload.policies ?? []);
    if (!selectedPolicyId && payload.policies.length > 0) {
      setSelectedPolicyId(payload.policies[0].policy_id);
    }
  };

  const loadMapping = async (policyId: string) => {
    try {
      const payload = await governanceApi.getPolicyMapping(ctx, policyId);
      setMapping(payload);
    } catch {
      setMapping(null);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    const bootstrap = async () => {
      setIsLoading(true);
      try {
        await loadPolicies();
        if (!isCancelled) {
          setMessage("");
        }
      } catch {
        if (!isCancelled) {
          setMessage("Unable to load policy workspace. Check org access and role permissions.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    void bootstrap();
    return () => {
      isCancelled = true;
    };
    // Initial hydration only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPolicyId) {
      setMapping(null);
      return;
    }
    void loadMapping(selectedPolicyId);
    // Selected policy changes should refresh mapping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPolicyId]);

  const uploadPolicy = async () => {
    if (!policyContent.trim()) {
      setMessage("Policy text is required before upload.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const payload = await governanceApi.uploadPolicy(ctx, policyFileName, policyContent);
      await loadPolicies();
      setSelectedPolicyId(payload.policy_id);
      setMessage("Policy uploaded. You can now map controls.");
    } catch {
      setMessage("Upload failed. Verify schema headers, role, and policy content.");
    } finally {
      setIsSaving(false);
    }
  };

  const mapSelectedPolicy = async () => {
    if (!selectedPolicyId) {
      setMessage("Select a policy before mapping.");
      return;
    }
    setIsMapping(true);
    setMessage("");
    try {
      await governanceApi.mapPolicy(ctx, selectedPolicyId);
      await Promise.all([loadPolicies(), loadMapping(selectedPolicyId)]);
      setMessage("Mapping complete. Review controls and unresolved clauses.");
    } catch {
      setMessage("Mapping failed. Check policy content and endpoint permissions.");
    } finally {
      setIsMapping(false);
    }
  };

  return {
    isAdmin,
    policies,
    selectedPolicyId,
    setSelectedPolicyId,
    mapping,
    policyFileName,
    setPolicyFileName,
    policyContent,
    setPolicyContent,
    message,
    isLoading,
    isSaving,
    isMapping,
    uploadPolicy,
    mapSelectedPolicy
  };
}

