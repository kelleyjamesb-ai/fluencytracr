# Workflow & Attention Integration Map (WAIM) — v2 (Descriptive)

artifact_type: DESCRIPTIVE  
execution_authority: NONE  
governance_status: CLOSED  
scope: placement_rationale_only  

---

## 1. Purpose (Locked)

This document answers one question only:

**How may already-approved Phase 2 orientation signals appear inside real workflows such that they provide presence-awareness without becoming a destination, a status check, a reassurance loop, or a monitoring mechanism?**

This document is artifact discipline, not product design.

---

## 2. Non-Executability Notice (Binding)

This artifact must **not** be imported, parsed, referenced, or used by runtime code, configuration, CI, or tests as a source of system behavior.

- This document is not a schema.
- This document is not configuration.
- This document is not a placement contract.
- Removing this document must not change system behavior.

Any implementation behavior must be governed exclusively by closed governance artifacts.

---

## 3. Scope Constraints (Non-Negotiable)

This document must not:

- Introduce new signals  
- Modify Phase 2 signals  
- Define detection, eligibility, inference, or readiness logic  
- Specify state machines, triggers, conditionals, or evaluation logic  
- Enable checking, polling, reassurance, or monitoring narratives  
- Create destinations, pages, dashboards, feeds, or recall surfaces  
- Enable comparison across people, teams, roles, or time  

If any reader can infer new system behavior from this document, it has failed.

---

## 4. Signals Referenced (Strictly Limited)

This document may reference **only** the following Phase 2 orientation signals, by name only:

- `verification_presence`
- `abandonment`

This document does not define what these signals are, how they are detected, when they appear, or what they mean.

---

## 5. Placement Rationale Principles (Descriptive Only)

### 5.1 Silence as Default

Silence is the default posture.  
If presence-awareness is not strictly necessary to prevent misuse or immediate workflow risk, it must remain silent.

### 5.2 Ephemeral and Non-Reliable

Any appearance (if it exists elsewhere in the system) must be:

- Brief  
- Context-bounded  
- Non-recallable  
- Non-reliable  

No role should expect, depend on, or confirm presence.

### 5.3 No Destinations

No role should be able to:

- Navigate to FluencyTracr  
- Revisit prior appearances  
- Confirm absence as reassurance  
- Use repetition to induce visibility  

---

## 6. Roles in Scope (Descriptive)

Roles are listed without hierarchy or implication of oversight.

### Role: Individual Contributor (Knowledge Work)

**Work context (descriptive only):**  
Producing or editing work that incorporates AI output within a primary tool.

**What must never be inferred:**  
- Skill, performance, competence, maturity, improvement, or decline  
- Safety, correctness, or readiness  
- Oversight, monitoring, or compliance evaluation  
- Approval or disapproval of work or behavior  

---

## 7. Workflow Touchpoints (Non-Destination Moments)

The following are descriptive moments where misinterpretation risk is highest.  
They are not triggers, permissions, or implementation instructions.

### Touchpoint A: Inline Editing of AI Output

**Context:**  
The user is already engaged in corrective action.

**Placement constraints (descriptive):**  
- May surface only as a fleeting, ignorable cue within the immediate editing moment  
- Must never persist beyond the immediate context  
- Must never form a stable location  
- Must suppress if repetition could train expectation  

**Explicit non-meanings:**  
- Does not certify verification quality  
- Does not imply content safety  
- Does not imply correct behavior  

**Signal name permitted:**  
- `verification_presence`

---

### Touchpoint B: Discarding AI Output Without Use

**Context:**  
The user disengages from an AI output.

**Placement constraints (descriptive):**  
- May surface only in the immediate discard moment  
- Must disappear immediately  
- Must not accumulate or form a record  
- Must suppress if repetition could create self-assessment  

**Explicit non-meanings:**  
- Does not label under-use or misuse  
- Does not imply missed opportunity  
- Does not imply concern or evaluation  

**Signal name permitted:**  
- `abandonment`

---

## 8. Adversarial Misread Prevention

This document is valid only if a reasonable reader **cannot** infer permission to build:

- Placement configuration systems  
- Rules engines  
- Readiness or eligibility states  
- Durable observability surfaces  

If a future contributor could say “we should wire the system to read WAIM,” this document has failed.

---

## 9. Supersession Notice (Mandatory)

This document supersedes any prior WAIM artifacts that resemble executable configuration.

All such artifacts must be archived under:

`docs/governance/archive/`

Each archived file must include a notice:

**SUPERSEDED**  
This artifact is archived because it could be misread as executable authorization.  
It must not be imported, parsed, or referenced by runtime code, configuration, CI, or tests.  
See `docs/governance/phase3/WAIM_v2_DESCRIPTIVE.md`.

---

## 10. Closure Statement

This document introduces no new behavior.  
It grants no permission to expand observability.  
It exists solely to prevent misinterpretation and drift.

Phase 3 remains closed.
