# Reliability Factor for Value Realization

Audience: AIOMs, value-realization PMs, and time-saved pipeline consumers.

Reliability Factor helps explain how much confidence to place in a surfaced aggregate workflow pattern. It is a `0.000` to `1.000` composite that looks at whether people verify AI output, recover successfully when the workflow gets messy, avoid abandonment, and avoid repeated friction loops.

In plain language: it tells you whether a surfaced time-saved or value-realization signal looks operationally dependable.

## What It Means

| Range | Plain-language read |
| --- | --- |
| `0.80` to `1.00` | Strong reliability pattern. The workflow shows verification and recovery with limited abandonment or repeated friction. |
| `0.50` to `<0.80` | Mixed reliability pattern. The workflow may still support a value claim, but the story should name the risk or improvement area. |
| `0.00` to `<0.50` | Weak reliability pattern. Treat the surfaced signal cautiously and look for enablement, workflow, or tooling friction before leaning on it commercially. |

Reliability Factor only appears when FluencyTracr has already cleared its fail-closed suppression gates. If the verdict is `SUPPRESS`, Reliability Factor is `null`.

## How Paul and Karthik Can Use It

For Paul Li's time-saved pipeline, Reliability Factor can make a time-saved estimate more defensible by separating raw acceleration from evidence quality. A workflow can look fast but still be unreliable if users abandon it, loop repeatedly, or skip verification.

For Karthik Rajkumar's value-realization consumers, Reliability Factor can support a clearer customer narrative:

- "This workflow is not only faster; the aggregate behavior suggests people are using it in a reliable way."
- "This workflow shows value potential, but abandonment and friction loops indicate enablement work is needed before we make a stronger claim."
- "This signal is suppressed, so we should not convert it into a customer-facing value claim yet."

Recommended use:

| Consumer need | Use Reliability Factor to |
| --- | --- |
| Prioritize value stories | Favor surfaced workflows with stronger reliability patterns. |
| Qualify time-saved claims | Add context to acceleration evidence before it becomes a business-value narrative. |
| Guide enablement | Identify whether verification, recovery, abandonment, or friction loops are weakening the workflow. |
| Protect credibility | Avoid overstating value when the behavioral evidence is surfaced but operationally mixed. |

## What It Is Not

- It is not a hallucination detector.
- It is not a gate and does not decide whether evidence surfaces.
- It is not ROI, causality, statistical significance, or outcome attribution.
- It is not a user score, manager scorecard, or surveillance measure.
- It does not inspect content or identify people.

## Recommended Language

Use this phrasing in value-realization readouts:

> Reliability Factor describes whether surfaced aggregate workflow evidence appears operationally dependable based on verification, recovery, abandonment, and friction-loop patterns.

Avoid saying:

> Reliability Factor proves the AI answer was correct.

Better:

> Reliability Factor helps qualify whether the observed workflow pattern is strong enough to support a credible value-realization story.
