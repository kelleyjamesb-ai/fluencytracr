import { useCallback, useEffect, useMemo, useState } from "react";
import { GovernanceApiError, governanceApi } from "../lib/governanceApi";
import { parsePolicyDocument } from "../lib/policyDocumentParser";
import { useGovernanceContext } from "./useGovernanceContext";
import type { MappingResponse, PolicySummary } from "../types/governance";

const MAX_UPLOAD_FILES = 8;
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type ParsedPolicyUpload = {
  fileName: string;
  content: string;
  contentType: string;
};

type UploadedPolicyRecord = {
  policyId: string;
  fileName: string;
  contentType: string;
};

const describeApiError = (error: unknown, fallback: string) => {
  if (error instanceof GovernanceApiError) {
    return `${fallback}: ${error.message} (HTTP ${error.status})`;
  }
  return fallback;
};

export function useGovernanceDocumentWorkspace() {
  const { orgId, role, isAdmin } = useGovernanceContext();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [mapping, setMapping] = useState<MappingResponse | null>(null);
  const [policyFileName, setPolicyFileName] = useState("governance-policy.txt");
  const [policyContent, setPolicyContent] = useState("");
  const [policyContentType, setPolicyContentType] = useState("text/plain");
  const [parsedUploads, setParsedUploads] = useState<ParsedPolicyUpload[]>([]);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false);
  const [isDeletingPolicyId, setIsDeletingPolicyId] = useState<string | null>(null);
  const [isSeedingSynthetic, setIsSeedingSynthetic] = useState(false);
  const [isResettingSandbox, setIsResettingSandbox] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgBootstrapNeeded, setOrgBootstrapNeeded] = useState(false);
  const [lastBatchError, setLastBatchError] = useState("");

  const ctx = useMemo(() => ({ orgId, role }), [orgId, role]);

  const loadPolicies = useCallback(async () => {
    try {
      const payload = await governanceApi.listPolicies(ctx);
      setOrgBootstrapNeeded(false);
      setPolicies(payload.policies ?? []);
      setSelectedPolicyId((currentPolicyId) => {
        if (payload.policies.length === 0) {
          return "";
        }
        if (currentPolicyId && payload.policies.some((policy) => policy.policy_id === currentPolicyId)) {
          return currentPolicyId;
        }
        return payload.policies[0].policy_id;
      });
    } catch (error) {
      if (error instanceof GovernanceApiError && error.status === 404) {
        setOrgBootstrapNeeded(true);
      }
      throw error;
    }
  }, [ctx]);

  const loadMapping = useCallback(async (policyId: string) => {
    try {
      const payload = await governanceApi.getPolicyMapping(ctx, policyId);
      setMapping(payload);
    } catch {
      setMapping(null);
    }
  }, [ctx]);

  const appendOptimisticPolicies = (uploaded: UploadedPolicyRecord[]) => {
    if (uploaded.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    setPolicies((current) => {
      const byId = new Map(current.map((policy) => [policy.policy_id, policy]));
      for (const item of uploaded) {
        if (!byId.has(item.policyId)) {
          byId.set(item.policyId, {
            policy_id: item.policyId,
            file_name: item.fileName,
            content_type: item.contentType,
            source_format: "text",
            clause_count: 0,
            created_at: now,
            latest_mapping: null
          });
        }
      }
      return Array.from(byId.values()).sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
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
      } catch (error) {
        if (!isCancelled) {
          if (error instanceof GovernanceApiError && error.status === 404) {
            setMessage(
              `Organization ${orgId} was not found. Initialize an organization to start policy mapping.`
            );
          } else if (error instanceof GovernanceApiError && error.status === 403) {
            setMessage(`Access blocked: ${error.message}`);
          } else {
            setMessage("Unable to load policy workspace. Check org access and role permissions.");
          }
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

  const uploadPolicy = async (): Promise<string | null> => {
    if (parsedUploads.length > 0) {
      setIsSaving(true);
      setMessage("");
      setLastBatchError("");
      let successCount = 0;
      let failedCount = 0;
      let lastPolicyId = "";
      const uploaded: UploadedPolicyRecord[] = [];
      let firstBatchError = "";

      for (const upload of parsedUploads) {
        try {
          const payload = await governanceApi.uploadPolicy(
            ctx,
            upload.fileName,
            upload.content,
            upload.contentType
          );
          successCount += 1;
          lastPolicyId = payload.policy_id;
          uploaded.push({
            policyId: payload.policy_id,
            fileName: upload.fileName,
            contentType: upload.contentType
          });
        } catch (error) {
          failedCount += 1;
          if (!firstBatchError) {
            firstBatchError = describeApiError(error, `Upload failed for ${upload.fileName}`);
          }
        }
      }

      try {
        try {
          await loadPolicies();
        } catch {
          appendOptimisticPolicies(uploaded);
        }
        if (lastPolicyId) {
          setSelectedPolicyId(lastPolicyId);
        }
      } finally {
        setIsSaving(false);
      }

      if (successCount > 0 && failedCount === 0) {
        setParsedUploads([]);
        setMessage(`Uploaded ${successCount} documents. You can now run mapping.`);
      } else if (successCount > 0) {
        setLastBatchError(firstBatchError);
        setMessage(`Uploaded ${successCount} documents. ${failedCount} failed.${firstBatchError ? ` ${firstBatchError}` : ""}`);
      } else {
        setLastBatchError(firstBatchError);
        setMessage(firstBatchError || "Batch upload failed. Check organization access and backend connectivity.");
      }
      return lastPolicyId || null;
    }

    if (!policyContent.trim()) {
      setMessage("Policy text is required before upload, or select files for batch upload.");
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
      try {
        await loadPolicies();
      } catch {
        appendOptimisticPolicies([
          {
            policyId: payload.policy_id,
            fileName: policyFileName,
            contentType: policyContentType
          }
        ]);
      }
      setSelectedPolicyId(payload.policy_id);
      setMessage("Policy uploaded. You can now map controls.");
      return payload.policy_id;
    } catch (error) {
      setMessage(
        describeApiError(
          error,
          "Upload failed"
        )
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const mapPolicyById = async (policyId: string) => {
    setIsMapping(true);
    setMessage("");
    try {
      await governanceApi.mapPolicy(ctx, policyId);
      await Promise.all([loadPolicies(), loadMapping(policyId)]);
      setMessage("Mapping complete. Review controls and unresolved clauses.");
    } catch (error) {
      if (error instanceof GovernanceApiError) {
        setMessage(`Mapping failed: ${error.message}`);
      } else {
        setMessage("Mapping failed. Check policy content and endpoint permissions.");
      }
    } finally {
      setIsMapping(false);
    }
  };

  const mapSelectedPolicy = async () => {
    if (!selectedPolicyId) {
      setMessage("Select a policy before mapping.");
      return;
    }
    await mapPolicyById(selectedPolicyId);
  };

  const updateSelectedPolicy = async () => {
    if (!selectedPolicyId) {
      setMessage("Select a policy version before updating.");
      return;
    }
    if (!policyContent.trim()) {
      setMessage("Policy content is required to update a policy.");
      return;
    }
    setIsUpdatingPolicy(true);
    setMessage("");
    try {
      const updated = await governanceApi.updatePolicy(ctx, selectedPolicyId, {
        fileName: policyFileName,
        contentType: policyContentType,
        content: policyContent
      });
      await loadPolicies();
      setSelectedPolicyId(updated.policy_id);
      setMessage(
        updated.mapping_invalidated
          ? "Policy updated. Existing mapping was invalidated. Run Mapping again."
          : "Policy metadata updated."
      );
    } catch (error) {
      setMessage(describeApiError(error, "Policy update failed"));
    } finally {
      setIsUpdatingPolicy(false);
    }
  };

  const deletePolicy = async (policyId: string) => {
    setIsDeletingPolicyId(policyId);
    setMessage("");
    try {
      const deleted = await governanceApi.deletePolicy(ctx, policyId);
      await loadPolicies();
      setSelectedPolicyId((current) => (current === policyId ? "" : current));
      if (selectedPolicyId === policyId) {
        setMapping(null);
      }
      setMessage(
        `Policy deleted. Removed ${deleted.removed_mappings} related mappings.`
      );
    } catch (error) {
      setMessage(describeApiError(error, "Policy delete failed"));
    } finally {
      setIsDeletingPolicyId(null);
    }
  };

  const selectPolicyForMapping = (policyId: string) => {
    setSelectedPolicyId(policyId);
    setMessage(`Selected policy for mapping.`);
  };

  const uploadAndMapPolicy = async () => {
    const uploadedPolicyId = await uploadPolicy();
    if (!uploadedPolicyId) {
      return;
    }
    await mapPolicyById(uploadedPolicyId);
  };

  const seedSyntheticData = async () => {
    setIsSeedingSynthetic(true);
    setMessage("");
    try {
      const seeded = await governanceApi.seedSyntheticPolicies(ctx);
      await loadPolicies();
      const unresolvedCount = seeded.seeded.reduce((sum, item) => sum + item.unresolved_clauses, 0);
      setMessage(
        `Synthetic pack seeded: ${seeded.created_policies}/${seeded.synthetic_pack_size} policies mapped. Unresolved clauses: ${unresolvedCount}.`
      );
    } catch (error) {
      setMessage(describeApiError(error, "Synthetic data seed failed"));
    } finally {
      setIsSeedingSynthetic(false);
    }
  };

  const resetSandbox = async () => {
    setIsResettingSandbox(true);
    setMessage("");
    try {
      const reset = await governanceApi.resetSandbox(ctx);
      setSelectedPolicyId("");
      setMapping(null);
      setParsedUploads([]);
      await loadPolicies();
      setMessage(
        `Sandbox reset complete. Cleared ${reset.cleared.policies} policies and ${reset.cleared.mappings} mappings.`
      );
    } catch (error) {
      setMessage(describeApiError(error, "Sandbox reset failed"));
    } finally {
      setIsResettingSandbox(false);
    }
  };

  const parseSelectedFiles = async (files: FileList | File[]) => {
    const candidates = Array.from(files);
    if (candidates.length === 0) {
      return;
    }
    if (candidates.length > MAX_UPLOAD_FILES) {
      setMessage(`Select up to ${MAX_UPLOAD_FILES} files at once.`);
      return;
    }

    setIsParsingFile(true);
    setMessage("");
    const parsed: ParsedPolicyUpload[] = [];
    const errors: string[] = [];

    try {
      for (const file of candidates) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          errors.push(`${file.name}: exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
          continue;
        }
        try {
          const result = await parsePolicyDocument(file);
          if (!result.text) {
            errors.push(`${file.name}: no text extracted.`);
            continue;
          }
          parsed.push({
            fileName: file.name,
            content: result.text,
            contentType: result.contentType
          });
        } catch (error) {
          errors.push(
            error instanceof Error ? `${file.name}: ${error.message}` : `${file.name}: parse failed.`
          );
        }
      }

      setParsedUploads(parsed);
      if (parsed.length > 0) {
        setPolicyFileName(parsed[0].fileName);
        setPolicyContent(parsed[0].content);
        setPolicyContentType(parsed[0].contentType);
      }

      if (parsed.length > 0 && errors.length === 0) {
        setMessage(`Parsed ${parsed.length} documents. Click Upload Document to batch upload.`);
      } else if (parsed.length > 0) {
        setMessage(`Parsed ${parsed.length} documents. ${errors.length} skipped.`);
      } else {
        setMessage(errors[0] ?? "Unable to parse selected files.");
      }
    } finally {
      setIsParsingFile(false);
    }
  };

  const clearParsedUploads = () => {
    setParsedUploads([]);
    setMessage("Cleared selected documents.");
  };

  const initializeOrg = async () => {
    setIsCreatingOrg(true);
    setMessage("");
    try {
      const created = await governanceApi.createOrg(
        `Governance Org ${new Date().toLocaleDateString()}`,
        orgId
      );
      localStorage.setItem("orgId", created.org_id);
      setMessage(
        `Created org ${created.org_id}. Reloading workspace so Policy version reflects the new org context.`
      );
      window.location.reload();
    } catch (error) {
      if (error instanceof GovernanceApiError) {
        setMessage(`Unable to initialize organization: ${error.message}`);
      } else {
        setMessage("Unable to initialize organization.");
      }
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const hasPolicies = policies.length > 0;
  const hasSelectedPolicy = Boolean(selectedPolicyId);
  const selectedPolicy = policies.find((policy) => policy.policy_id === selectedPolicyId) ?? null;
  const hasPendingParsedUploads = parsedUploads.length > 0;
  const canRunMapping = isAdmin && hasSelectedPolicy && !isMapping;
  const shouldHighlightRunMapping = canRunMapping && !hasPendingParsedUploads;

  const nextStepText = orgBootstrapNeeded
    ? "Initialize organization to enable upload and mapping."
    : hasPendingParsedUploads
      ? "Step 1: click Upload Documents to save parsed files."
      : !hasPolicies
        ? "Step 1: upload at least one document."
        : !hasSelectedPolicy
          ? "Step 2: select a policy in inventory, then run mapping."
          : "Step 2: click Run Mapping.";

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
    parsedUploads,
    maxUploadFiles: MAX_UPLOAD_FILES,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
    isParsingFile,
    isCreatingOrg,
    orgBootstrapNeeded,
    hasPendingParsedUploads,
    hasPolicies,
    hasSelectedPolicy,
    selectedPolicy,
    hasMapping: Boolean(mapping),
    canRunMapping,
    shouldHighlightRunMapping,
    nextStepText,
    parseSelectedFiles,
    clearParsedUploads,
    initializeOrg,
    message,
    isLoading,
    isSaving,
    isMapping,
    isUpdatingPolicy,
    isDeletingPolicyId,
    isSeedingSynthetic,
    isResettingSandbox,
    uploadPolicy,
    uploadAndMapPolicy,
    mapSelectedPolicy,
    updateSelectedPolicy,
    deletePolicy,
    selectPolicyForMapping,
    seedSyntheticData,
    resetSandbox
  };
}
