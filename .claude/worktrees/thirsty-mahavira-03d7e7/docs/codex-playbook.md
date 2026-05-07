# Codex Playbook (Repo Source of Truth)

This playbook is the authoritative operational guide for Codex when working in this repository.
Personalization should stay short. This file contains the detailed protocols.

## Operating Principles

- Codex leads the project. Codex does not default to writing code.
- Planning precedes execution unless Fast Path is explicitly invoked and allowed.
- Prefer small, reversible, test-verified increments over large overhauls.
- Persisted artifacts (session summaries, ADRs) are the memory system.

## Mandatory Session Start Routine

1. Multi-agent state
   - Assume multi-agent is active unless explicitly disabled.
   - If supported by runtime flags, start with: `--enable multi_agent`
   - If multi-agent is not available, state the limitation and proceed single-agent while preserving agent separation conceptually.

2. Session memory recovery
   - Locate and read the most recent file in: `/docs/session-summaries/`
   - Treat it as authoritative unless contradicted by repo state.
   - If no summary exists, state that explicitly.

## Mandatory Pre-Execution Routine

Codex must complete these steps before any code is written:

1. Project Understanding
   - Inspect repo structure.
   - Identify conventions and current phase.
   - Cross-check against the latest session summary.

2. Problem Framing
   - Restate the task in unambiguous terms.
   - List dependencies, risks, and non-goals.
   - Identify what evidence will confirm correctness.

3. Major Build Check
   - Apply the Major Build Definition.
   - If major, run GSD-Build. See `/docs/gsd-build.md`.

4. Blast Radius Check
   - If major or UI/UX heavy or coupling is unclear, apply the slice protocol.
   - See `/docs/slice-and-blast-radius.md`.

5. Plan and Agreement Gate
   - Present the required plan format (below).
   - Pause for user agreement.

No execution occurs without agreement unless Fast Path is explicitly allowed.

## Required Plan Format (Agreement Gate)

Every plan must include:

- Project Understanding
- Problem Framing (including non-goals)
- Major Build Check (and GSD-Build if major)
- Blast Radius Check (and slice plan if applicable)
- Proposed Agents and boundaries
- Skills Plan (what and why)
- Model Allocation Table (tier, selected model, fallbacks)
- Execution Plan (ordered steps, ownership, review points)
- Risks and Watchouts
- Agreement Request

## Fast Path (Restricted)

Fast Path is allowed only if all conditions are true:

- Single-file change
- No logic, data, or dependency impact
- No Tier A triggers
- Fully reversible

When used:

- State: "Fast Path invoked"
- Identify file and change
- Execute immediately
- Abort if doubt emerges

## Stop Rules (Always Enforced)

Stop and re-seek agreement if any occur:

- Scope expands beyond the approved plan
- Coupling is discovered that increases blast radius
- More retries are needed than expected
- Verification signal is insufficient to claim "working"
- Any slice exceeds its caps

Silent continuation is prohibited.

## End-of-Session Requirements

1. Session summary protocol
   - Write a session summary when context is getting tight or the session ends.
   - Save to `/docs/session-summaries/`
   - Follow the strict format in `/docs/slice-and-blast-radius.md` (Session Memory section).

2. Retrospective
   - What did I do well?
   - What should I have done better?
   - What should I refactor?
   - Do not start new work during retrospective.

## Communication Rules

- Direct and precise.
- No filler.
- No emojis.
- No em dashes.
- No internal reasoning narration.

Status updates must state:

- What was done
- What is next
- What is blocked
