# Phase 6 — Authentication & Authorization Threat Model

**Scope:** Authentication & Authorization ONLY.
**Status:** FAIL — Not production-ready.

---

## Current Mechanism

The sole authentication/authorization mechanism is an unverified HTTP header:

```typescript
// backend/src/rbac.ts:17
const rawRole = req.header("x-role") ?? "EXEC_VIEWER";
```

- **Authentication:** None. No identity verification exists.
- **Authorization:** Header-based role claim, validated against Zod schema for known values, enforced by `rbacMiddleware`.
- **Default role:** `EXEC_VIEWER` (if no header provided).
- **Dependencies:** Zero auth-related packages (no jsonwebtoken, passport, bcrypt, etc.).

---

## Threat Matrix

### T1: Identity Spoofing
| Property | Value |
|----------|-------|
| **Attack** | Send `x-role: ADMIN` header from any client |
| **Precondition** | Network access to the API |
| **Outcome** | Full ADMIN access to all endpoints |
| **Severity** | CRITICAL |
| **Tested** | `phase6_auth_threat_model.test.ts` — "identity is never established" |
| **Verdict** | **FAIL** — Identity cannot be verified. |

### T2: Privilege Escalation
| Property | Value |
|----------|-------|
| **Attack** | Change `x-role` header between requests |
| **Precondition** | Any authenticated or unauthenticated client |
| **Outcome** | Escalate from EXEC_VIEWER to ADMIN |
| **Severity** | CRITICAL |
| **Tested** | `phase6_auth_threat_model.test.ts` — "EXEC_VIEWER can escalate to ADMIN" |
| **Verdict** | **FAIL** — No identity binding between requests. |

### T3: Token Bypass
| Property | Value |
|----------|-------|
| **Attack** | N/A — there are no tokens to bypass |
| **Precondition** | — |
| **Outcome** | Default EXEC_VIEWER role assigned automatically |
| **Severity** | CRITICAL |
| **Tested** | `phase6_auth_threat_model.test.ts` — "there are no tokens to bypass" |
| **Verdict** | **FAIL** — No authentication token mechanism exists. |

### T4: Replay Attack
| Property | Value |
|----------|-------|
| **Attack** | Replay any request — no nonce, no expiry, no session |
| **Precondition** | Intercepted request (trivial without TLS) |
| **Outcome** | Exact replay succeeds indefinitely |
| **Severity** | HIGH |
| **Tested** | Implicit — no temporal binding on any request |
| **Verdict** | **FAIL** — No replay protection. |

### T5: Audit Log Access Without Accountability
| Property | Value |
|----------|-------|
| **Attack** | Claim ADMIN role, access audit logs, no trace of who accessed |
| **Precondition** | Network access |
| **Outcome** | Audit logs readable without identity verification |
| **Severity** | HIGH |
| **Tested** | `phase6_auth_threat_model.test.ts` — "fabricated role header is accepted" |
| **Verdict** | **FAIL** — Audit access is unaccountable. |

---

## What RBAC Gets Right (Assuming Honest Clients)

| Check | Status |
|-------|--------|
| Unknown role values rejected (400) | PASS |
| EXEC_VIEWER blocked from ADMIN-only endpoints (403) | PASS |
| EXEC_VIEWER blocked from team-level aggregation | PASS |
| Role hierarchy enforced in `hasMinimumRole` | PASS |
| Zod validation on role enum | PASS |

**Conclusion:** RBAC enforcement logic is correct. The problem is that role claims are unverified.

---

## Requirements That Cannot Be Tested (FAIL)

| Requirement | Reason |
|-------------|--------|
| Token validation tests | No tokens exist |
| Token expiry enforcement | No tokens exist |
| Token signature verification | No signing mechanism exists |
| Session timeout enforcement | No sessions exist |
| Refresh token rotation | No refresh tokens exist |
| Identity binding to audit events | No identity to bind |

**Per Phase 6 rules: If any requirement cannot be tested, explicitly FAIL.**

---

## Verdict

**FAIL.** Authentication does not exist. Authorization logic is sound but sits on an unverified foundation. All five threats are exploitable with zero sophistication.

**Phase 6 Section 1 cannot be closed until real authentication (JWT RS256 or federated OAuth) is implemented, tested, and verified by QA.**
