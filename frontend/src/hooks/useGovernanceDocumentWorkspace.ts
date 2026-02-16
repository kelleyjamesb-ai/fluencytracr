import { useCallback, useEffect, useMemo, useState } from "react";
import { governanceApi } from "../lib/governanceApi";
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
    if (parsedUploads.length > 0) {
      setIsSaving(true);
      setMessage("");
      let successCount = 0;
      let failedCount = 0;
      let lastPolicyId = "";

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
        } catch {
          failedCount += 1;
        }
      }

      try {
        await loadPolicies();
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
    parseSelectedFiles,
    clearParsedUploads,
    message,
    isLoading,
    isSaving,
    isMapping,
    uploadPolicy,
    mapSelectedPolicy
  };
}
