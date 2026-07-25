# Change: Add GCP security-authority contract

## Why

Section 7.2 closes canonical runtime objects and hashes but deliberately leaves HSM key custody, Workload Identity Federation, IAM authorization, image provenance, role separation, rollover, and authority-audit evidence to Section 7.3. Without a closed Section 7.3 contract, later attestation or receipt work could launder synthetic policy, ambiguous principals, alternate credentials, or incomplete access evidence into apparent authority.

## What Changes

- Add a docs-only GCP security-authority contract with exact public-source revalidation.
- Define separate synthetic policy and evidence-snapshot objects and domain-separated hashes.
- Select digest-based Confidential Space WIF with direct Cloud KMS access and no service-account impersonation.
- Define two distinct Cloud HSM asymmetric-signing key profiles for image provenance and runtime receipts.
- Define a default-deny 14-role capability matrix and transitive controller fixed-point proof.
- Define alternate-credential denial, effective-access tuple, held rollover, and authority-audit interfaces.
- Keep live policy/evidence approval lists empty and runtime authority held.

## Impact

- New docs/contracts/OpenSpec/test artifacts only.
- No GCP access or mutation, credentials, billing, keys, IAM/WIF policy, signing, image operation, canary, deployment, qualification, model execution, customer data, API, schema, persistence, or UI.
- No Section 7.2 hash preimage change and no Section 7.4–7.8 implementation.
- No canonical event, suppression reason, threshold, scoring, ranking, ROI, causality, or customer-facing output change.
