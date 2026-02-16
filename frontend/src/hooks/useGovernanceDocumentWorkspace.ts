import { useCallback, useEffect, useMemo, useState } from "react";
import { governanceApi } from "../lib/governanceApi";
import { parsePolicyDocument } from "../lib/policyDocumentParser";
import { useGovernanceContext } from "./useGovernanceContext";
import type { MappingResponse, PolicySummary } from "../types/governance";

export function useGovernanceDocumentWorkspace() {
  const { orgId, role, isAdmin } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  const [policyFileName, setPolicyFileName] = useState("governance-policy.txt");
  const [policyContent, setPolicyContent] = useState("");
  const [policyContentType, setPolicyContentType] = useState("text/plain");
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);

  const ctx = useMemo(() => ({ orgId, role }), [orgId, role]);

  const loadPolicies = useCallback(async () => {
    const payload = await governanceApi.listPolicies(ctx);
    setPolicies(payload.policies ?? []);
    setSelectedPolicyId((currentPolicyId) => {
      if (currentPolicyId || payload.policies.length === 0) {
        return currentPolicyId;
      }
      return payload.policies[0].policy_id;
    });
  }, [ctx]);

  const loadMapping = useCallback(async (policyId: string) => {
    try {
      const payload = await governanceApi.getPolicyMapping(ctx, policyId);
      setMapping(payload);
    } catch {
      setMapping(null);
    }
  }, [ctx]);

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
  }, [loadPolicies]);

  useEffect(() => {
    if (!selectedPolicyId) {
      setMapping(null);
      return;
    }
    void loadMapping(selectedPolicyId);
  }, [selectedPolicyId, loadMapping]);

  const uploadPolicy = async () => {
    if (!policyContent.trim()) {
      setMessage("Policy text is required before upload.");
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      const payload = await governanceApi.uploadPolicy(
        ctx,
        policyFileName,
        policyContent,
        policyContentType
      );
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

  const parseSelectedFile = async (file: File) => {
    setIsParsingFile(true);
    setMessage("");
    try {
      const result = await parsePolicyDocument(file);
      if (!result.text) {
        throw new Error("No text could be extracted from this document.");
      }
      setPolicyFileName(file.name);
      setPolicyContent(result.text);
      setPolicyContentType(result.contentType);
      setMessage(`Parsed ${file.name}. Review extracted text, then upload.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to parse selected file.");
    } finally {
      setIsParsingFile(false);
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
    policyContentType,
    isParsingFile,
    parseSelectedFile,
    message,
    isLoading,
    isSaving,
    isMapping,
    uploadPolicy,
    mapSelectedPolicy
  };
}
