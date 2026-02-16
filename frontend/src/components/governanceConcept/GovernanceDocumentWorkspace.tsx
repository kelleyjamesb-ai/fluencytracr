import { useGovernanceDocumentWorkspace } from "../../hooks/useGovernanceDocumentWorkspace";

export function GovernanceDocumentWorkspace() {
  const {
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
    maxUploadFiles,
    maxFileSizeMb,
    isParsingFile,
    parseSelectedFiles,
    clearParsedUploads,
    message,
    isLoading,
    isSaving,
    isMapping,
    uploadPolicy,
    mapSelectedPolicy
  } = useGovernanceDocumentWorkspace();

  return (
    <section className="gc-card gc-workspace">
      <div className="gc-exec-header">
        <p className="gc-mono">Compliance Officer and CISO Workspace</p>
        <h2>Governance Document Upload and Mapping</h2>
        <p>
          Upload governance documents, map them to controls, and track mapping readiness.
        </p>
      </div>

      {!isAdmin && (
        <p className="gc-readonly-note">
          Read-only mode: only `ADMIN` can upload or run mapping. You can still review existing policy and mapping
          summaries.
        </p>
      )}

      <div className="gc-workspace-grid">
        <article className="gc-workspace-pane">
          <h3>1. Upload document</h3>
          <div className="gc-form-grid">
            <label>
              Upload files (.pdf or .docx)
              <input
                className="gc-input"
                type="file"
                accept=".pdf,.doc,.docx"
                multiple
                onChange={(event) => {
                  const files = event.target.files;
                  if (files && files.length > 0) {
                    void parseSelectedFiles(files);
                  }
                  event.currentTarget.value = "";
                }}
                disabled={!isAdmin || isSaving || isParsingFile}
              />
            </label>
            <p className="gc-subtle">Limit: up to {maxUploadFiles} files, {maxFileSizeMb}MB each.</p>
            {parsedUploads.length > 0 && (
              <>
                <p className="gc-subtle">{parsedUploads.length} documents ready for upload:</p>
                <ul className="gc-policy-list">
                  {parsedUploads.map((upload) => (
                    <li key={upload.fileName}>
                      <span>{upload.fileName}</span>
                      <span className="gc-mono">{upload.contentType}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="gc-btn gc-btn-outline"
                  onClick={clearParsedUploads}
                  disabled={!isAdmin || isSaving || isParsingFile}
                >
                  Clear Selected Files
                </button>
              </>
            )}
            <label>
              File name
              <input
                className="gc-input"
                type="text"
                value={policyFileName}
                onChange={(event) => setPolicyFileName(event.target.value)}
                disabled={!isAdmin || isSaving}
              />
            </label>
            <label>
              Policy content
              <textarea
                className="gc-input gc-textarea"
                value={policyContent}
                onChange={(event) => setPolicyContent(event.target.value)}
                placeholder="Paste governance policy text..."
                disabled={!isAdmin || isSaving}
              />
            </label>
            <p className="gc-subtle">Detected content type: {policyContentType}</p>
          </div>
          <button
            type="button"
            className="gc-btn gc-btn-primary"
            onClick={uploadPolicy}
            disabled={!isAdmin || isSaving || isParsingFile}
          >
            {isParsingFile
              ? "Parsing..."
              : isSaving
                ? "Uploading..."
                : parsedUploads.length > 0
                  ? "Upload Documents"
                  : "Upload Document"}
          </button>
        </article>

        <article className="gc-workspace-pane">
          <h3>2. Run mapping</h3>
          <label>
            Policy version
            <select
              className="gc-input"
              value={selectedPolicyId}
              onChange={(event) => setSelectedPolicyId(event.target.value)}
              disabled={policies.length === 0 || isMapping}
            >
              <option value="">Select policy</option>
              {policies.map((policy) => (
                <option key={policy.policy_id} value={policy.policy_id}>
                  {policy.file_name} ({new Date(policy.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="gc-btn gc-btn-secondary" onClick={mapSelectedPolicy} disabled={!isAdmin || !selectedPolicyId || isMapping}>
            {isMapping ? "Mapping..." : "Run Mapping"}
          </button>

          {mapping && (
            <div className="gc-mapping-summary">
              <p><strong>Latest mapping:</strong> {new Date(mapping.generated_at).toLocaleString()}</p>
              <p><strong>Controls mapped:</strong> {mapping.controls.length}</p>
              <p><strong>Unresolved clauses:</strong> {mapping.unresolved_clauses.length}</p>
            </div>
          )}
        </article>
      </div>

      <article className="gc-workspace-pane">
        <h3>3. Policy inventory</h3>
        {isLoading ? (
          <p>Loading policies...</p>
        ) : policies.length === 0 ? (
          <p>No governance policies uploaded yet.</p>
        ) : (
          <ul className="gc-policy-list">
            {policies.map((policy) => (
              <li key={policy.policy_id}>
                <span>{policy.file_name}</span>
                <span className="gc-mono">{policy.latest_mapping ? "mapped" : "not mapped"}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      {message && <p className="gc-workspace-message">{message}</p>}
    </section>
  );
}
