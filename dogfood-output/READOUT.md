# Multi-Surface Dogfood Readout

Weighted Reliability Factor: 0.712
Weighted Quality Multiplier: 1.207

## Per-surface Results

| workflow_id | real cohort | verdict | reliability | quality multiplier | AIVM tags |
| --- | ---: | --- | ---: | ---: | --- |
| AGENT | 1938547 | SURFACE | 0.702 | 1.196 | ACCELERATION / QUALITATIVE |
| CHAT | 1152646 | SURFACE | 0.725 | 1.22 | ACCELERATION / QUALITATIVE |
| GLEANBOT | 78612 | SURFACE | 0.749 | 1.249 | ACCELERATION / QUALITATIVE |
| SUPPORT_NEXT_STEPS | 37680 | SURFACE | 0.748 | 1.248 | ACCELERATION / QUALITATIVE |
| AGENT_LIVE_PREVIEW | 30739 | SURFACE | 0.711 | 1.204 | ACCELERATION / QUALITATIVE |
| AI_ANSWER | 19534 | SURFACE | 0.735 | 1.235 | ACCELERATION / QUALITATIVE |
| VOICE_CHAT | 18034 | SUPPRESS | n/a | n/a | UNCLASSIFIED / QUALITATIVE |
| UNSPECIFIED | 14823 | SURFACE | 0.722 | 1.221 | ACCELERATION / QUALITATIVE |
| INTERACTIVE_COMPILER | 11403 | SURFACE | 0.722 | 1.216 | ACCELERATION / QUALITATIVE |
| SPACES | 6259 | SURFACE | 0.725 | 1.223 | ACCELERATION / QUALITATIVE |
| INLINE_MENU | 4444 | SURFACE | 0.734 | 1.234 | ACCELERATION / QUALITATIVE |
| EMBEDDED_INTEGRATION_SUPPORT | 2779 | SURFACE | 0.749 | 1.249 | ACCELERATION / QUALITATIVE |
| PRISM | 2340 | SURFACE | 0.702 | 1.199 | ACCELERATION / QUALITATIVE |
| GITHUB_PR_DESCRIPTION_GENERATOR | 542 | SUPPRESS | n/a | n/a | UNCLASSIFIED / QUALITATIVE |

## Skipped Surfaces

| workflow_id | real cohort | reason |
| --- | ---: | --- |
| UNCLASSIFIED | 6206376 | Blank workflow_id in input — likely unclassified BigQuery feature rows; relabeled UNCLASSIFIED |
| MCP_AGENT_WORKFLOW | 190 | window_days < 60 |
| EXTENSION_SUPPORT | 76 | window_days < 60 |

## Methodology Footnote

Rates come from customer-supplied BigQuery aggregate rows. The driver expands each included surface into 1000 synthetic GCE-shaped workflow runs so the V1 dogfood ingest path can evaluate the same aggregate behavior without using real customer data or row-level records.
Weighted rollups use real_cohort_size from the input rows and include SURFACE rows only. Each surface is evaluated independently before any read-only weighted summary is computed.
