# Design: GSD Dashboard Shell

## Shell Layout Decision

**Decision:** Reuse the existing `.app-shell` (280px sidebar + 1fr main) layout and
the generic `Sidebar.tsx` component that already exists in `frontend/src/components/Sidebar.tsx`.

**Rationale:** The CSS classes `.app-shell`, `.sidebar`, `.sidebar-brand`, `.sidebar-nav`,
`.nav-item`, and `.sidebar-footer` are already fully styled in `styles.css` and used by
`Dashboard.tsx`. `Sidebar.tsx` takes a generic `items: NavItem[]` array, so role-gating
is achieved simply by computing a filtered items array in `GSDDashboard` — no new sidebar
component needed.

**Alternative rejected:** Top-nav shell (horizontal navigation bar at top). Rejected
because it would require ~150 lines of new CSS, creates a different visual language from
the existing dark-sidebar pattern, and adds no functional benefit for this use case.

**Alternative rejected:** React Router nested routes per section (`/board`, `/operator`,
`/enablement`). Rejected because it adds URL complexity and browser history entries for
section switches, which is inconsistent with how `Dashboard.tsx` handles panel switching.
Single `useState` in `GSDDashboard` is simpler and matches existing patterns.

## Role Gating Strategy

**Decision:** Positive role checks (`role === "ADMIN"`) in `GSDDashboard` for both the
sidebar nav items array AND the section content conditional. This is a double gate.

**Rationale:** If role changes (e.g., session switcher mid-session), the active section
is re-evaluated on render. An unknown or unexpected role string falls through to the most
restrictive view (Board layer only) by default.

**Risk:** React conditional rendering with `&&` is not security-enforced at the network
level. However, the backend already enforces RBAC on all API endpoints, so rendering a
section without its corresponding role would result in 403 responses from the API, not
a data leak. The frontend gating is a UX guard, not a security perimeter.

## Freshness Chip as Required Element

**Decision:** `FreshnessChip` is a required companion to any status display. It is never
optional where status is rendered.

**Rationale:** GSD spec section 4 states "freshness badge always visible" and "green is
not done forever". The current `ExecutiveHeatmapV1` renders freshness in the heatmap rows
but not in the CEO summary row. `FreshnessChip` as a standalone atom makes this
requirement enforceable by the TypeScript compiler (required prop).

## CSS Namespace

**Decision:** Introduce `.gsd-*` prefix for all new shell-level and atom-level classes.
Continue using `.gc-*` classes for existing widget-level content inside the new sections.

**Rationale:** `.gc-*` is a page-level widget namespace (cards, heatmap cells, tags).
`.gsd-*` is a shell + atom namespace. This separation prevents class name collisions and
makes it clear which classes are new to this change.

## WorkflowStepRail Extension

**Decision:** Add optional `steps?: readonly { id: string; label: string }[]` prop.
Existing callers that pass no `steps` prop continue to use the hardcoded 2-step array.
`EnablementView` will pass the full 5-step GSD spec array.

**Rationale:** Non-breaking additive prop. Avoids copy/pasting the step rail JSX into
`EnablementView`.

## Deferred Widget Handling

**Decision:** Render `.gsd-stub-card` placeholder cards for V1.1/V2 widgets in the
Operator and Enablement sections. Each stub card states exactly what it will become and
why it is not available yet ("requires backend endpoint X").

**Rationale:** Empty sections would be confusing. Stub cards communicate the roadmap
intent and prevent the role view from looking unfinished.

## Open Questions (resolved before implementation)

Q: Should ENABLEMENT_LEAD see the Operator heatmap?
A: No. GSD spec section 3.2 lists ADMIN and GOV_OPERATOR for the operator layer.
ENABLEMENT_LEAD gets Board + Enablement views only.

Q: Where does the inline session controls panel (orgId/role switcher) live?
A: Moved to a `<details>` element in the sidebar footer. Dev tool only, not primary UI.
