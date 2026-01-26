# TG4: Executive-Safe Signal Meanings (Org/Function Only)

This document defines executive-safe meanings and explicit non-meanings for V1 signals.
Signals are directional and aggregated at org or function level only. They indicate
hotspots for attention, not benchmarks or comparisons. Framing is governance and
operational enablement, not performance evaluation.

## Scope and framing

- Audience: executives and governance stakeholders.
- Aggregation: org-level and function-level rollups only.
- Purpose: strategic visibility into where AI-enabled external actions occur and
  where governance workflows appear engaged.
- Hotspots, not comparisons: signals highlight areas for review or enablement;
  they are not used to rank functions or tools.
- Confidence: interpretation depends on coverage and signal density; low
  confidence is a valid state and should not be over-interpreted.

## Signal meanings and non-meanings (V1)

### delegate_send_message
Meaning: AI initiated an outbound message to an external recipient (email, chat, or
notification) that was sent and persisted in the external system.
Non-meanings: Not a measure of message quality, accuracy, customer impact,
responsiveness, or individual/team performance.

### delegate_file_update
Meaning: AI wrote or modified a file in an external system with a persistent change
recorded (document, spreadsheet, or repository file).
Non-meanings: Not a measure of correctness, compliance, or business value of the
change.

### delegate_record_create
Meaning: AI created a new record in an external system of record (CRM, ticketing,
database, or similar).
Non-meanings: Not a measure of record quality, downstream adoption, or process
efficiency.

### delegate_record_update
Meaning: AI updated an existing record in an external system with a persistent
change logged.
Non-meanings: Not a measure of data integrity, policy adherence, or accountability.

### delegate_approval_request
Meaning: AI initiated a formal approval workflow that requires a human decision.
Non-meanings: Not a measure of approval outcomes, rigor, or compliance maturity.

### delegate_data_fetch
Meaning: AI retrieved data from an external system or API, reflecting an executed
data access action.
Non-meanings: Not a measure of data accuracy, privacy compliance, or analytic
sophistication.

### delegate_code_commit
Meaning: AI committed code to a repository, producing a persistent code change.
Non-meanings: Not a measure of code quality, security posture, or engineering
productivity.

### delegate_schedule_event
Meaning: AI created or scheduled a calendar event or meeting in an external
calendar system.
Non-meanings: Not a measure of meeting effectiveness, alignment, or workload
balance.

### delegate_task_assign
Meaning: AI assigned a task to a person in an external work management system.
Non-meanings: Not a measure of task completion, team capacity, or performance.

### delegate_payment_initiate
Meaning: AI initiated a payment or financial transaction in an external system.
Non-meanings: Not a measure of financial controls, fraud risk, or business outcomes.

