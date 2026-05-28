# Pilot Decision Memo

Date: 2026-05-28

Decision: `PROCEED_TO_EXECUTIVE_REHEARSAL_PACKET`

## Why

The internal pilot shows that FluencyTracr can separate raw AI activity from workflow-integrated evidence, trust evidence, source coverage, and value-readiness using aggregate telemetry we already collect.

## Evidence

- Scale-candidate cohort rows: 125,100.
- Trust-evidence-gap cohort rows: 6,537,249.
- Shallow-adoption cohort rows: 17,241.
- Focused-expert-use cohort rows: 1,250.
- Skill-read evidence rows with parent joins: 2,210,614 (99.6%).

## What We Can Promise

- Identify where AI is present versus embedded in workflow execution.
- Identify where post-friction continuation and verification evidence exist.
- Identify where trust and source coverage are too weak for interpretation.
- Route value hypotheses to the right next investigation.

## What We Cannot Promise Yet

- Dollarized ROI.
- Causal impact.
- Productivity lift.
- Output correctness.
- Employee, team, manager, or department scoring.

## Next Action

Build the external-facing executive rehearsal deck/report from this packet, then decide whether to pilot with a customer using the same aggregate-only variable names and evidence lanes.

## Glossary

- **AI Work Evidence:** Aggregate telemetry that shows where AI is present in real work, how it is connected to workflows, and where evidence is strong or weak.
- **AI surface:** A place where AI can be used, such as search, chat, autocomplete, a workflow run, an agent span, or an embedded assistant.
- **Workflow evidence:** Aggregate signs that AI is attached to a real work path instead of a standalone interaction.
- **Velocity:** How quickly AI-assisted work appears to move, using aggregate frequency, engagement, and repeat-use patterns.
- **Depth:** How embedded AI appears to be across surfaces and workflows, not how skilled any individual person is.
- **Frequency:** How often AI activity appears in the aggregate window.
- **Engagement:** How much aggregate interaction occurs around AI-assisted work, such as repeated use or continued activity.
- **Breadth:** How many distinct AI surfaces or work contexts appear in the aggregate evidence.
- **Reliability Factor:** A confidence lens that looks for abandonment, friction loops, recovery, and verification signals before interpreting behavior.
- **Quality Multiplier:** A caveat lens that can discount or amplify time-saved assumptions later; this packet does not use it to calculate ROI.
- **Trust evidence:** Aggregate signs that people verified, continued, corrected, recovered, or gave feedback after AI assistance.
- **Trust attribution:** Whether a trust signal can be attached to a workflow path with enough confidence to interpret it.
- **Evidence gap:** A place where activity exists but the supporting source coverage, attribution, or downstream context is not strong enough to interpret.
- **AI work pattern tier:** A plain-language bucket that separates raw AI activity from stronger workflow, verification, or source-coverage evidence.
- **Value-readiness zone:** An executive action lane that says what to do next, such as scale, redesign, repair trust loops, or hold interpretation.
- **Outcome evidence:** Customer-owned aggregate business context, such as a KPI window, that can be attached later without claiming causality by default.
- **Value hypothesis:** A testable idea about where AI may create value, such as acceleration, quality premium, or net-new work. It is not ROI proof.
- **Source coverage:** How complete and unambiguous the available telemetry is for a given aggregate interpretation.
- **Suppressed:** A fail-closed result where FluencyTracr withholds interpretation because the governed evidence bar is not met.
