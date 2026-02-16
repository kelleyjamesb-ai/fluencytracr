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
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgBootstrapNeeded, setOrgBootstrapNeeded] = useState(false);

  const ctx = useMemo(() => ({ orgId, role }), [orgId, role]);

  const loadPolicies = useCallback(async () => {
    try {
      const payload = await governanceApi.listPolicies(ctx);
      setOrgBootstrapNeeded(false);
      setPolicies(payload.policies ?? []);
      setSelectedPolicyId((currentPolicyId) => {
        if (currentPolicyId || payload.policies.length === 0) {
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

  const uploadPolicy = async () => {
    if (parsedUploads.length > 0) {
      setIsSaving(true);
      setMessage("");
      let successCount = 0;
      let failedCount = 0;
      let lastPolicyId = "";
      const uploaded: UploadedPolicyRecord[] = [];

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
        } catch {
          failedCount += 1;
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
        setMessage(`Uploaded ${successCount} documents. ${failedCount} failed.`);
      } else {
        setMessage("Batch upload failed. Verify headers, role, and document content.");
      }
      return;
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
      const created = await governanceApi.createOrg(`Governance Org ${new Date().toLocaleDateString()}`);
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
    parseSelectedFiles,
    clearParsedUploads,
    initializeOrg,
    message,
    isLoading,
    isSaving,
    isMapping,
    uploadPolicy,
    mapSelectedPolicy
  };
}
