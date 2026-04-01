"""
FluencyTracr Minimal Harness
Pattern detection step only (Phase 1)
"""

import json
from typing import Dict, Any, List
from anthropic import Anthropic

from .models import AnalysisBatch, AnalysisStep, BatchStatus, StepStatus
from .state_store import StateStore
from .adoption_normalizer import AdoptionCurveNormalizer


class MinimalHarness:
    """
    Phase 1: Pattern detection only

    Validates that Claude can detect patterns correctly
    before building full automation
    """

    def __init__(
        self,
        anthropic_api_key: str,
        state_store: StateStore,
        max_cost_usd: float = 5.0
    ):
        self.client = Anthropic(api_key=anthropic_api_key)
        self.state_store = state_store
        self.max_cost_usd = max_cost_usd
        self.normalizer = AdoptionCurveNormalizer()

        # Load system prompt
        with open("prompts/pattern_detection_system.txt", 'r') as f:
            self.system_prompt = f.read()

    def create_batch(
        self,
        org_id: str,
        bucket_start: str,
        signals: List[Dict[str, Any]],
        team_sizes: Dict[str, int]
    ) -> AnalysisBatch:
        """
        Create a new analysis batch

        Args:
            org_id: Organization identifier
            bucket_start: Week start in ISO 8601 format
            signals: List of behavioral signal aggregates
            team_sizes: Mapping of group_id to team size
        """

        batch_id = f"{org_id}-{bucket_start}"

        print(f"\n{'='*60}")
        print(f"Creating batch: {batch_id}")
        print(f"Signals: {len(signals)}")
        print(f"{'='*60}\n")

        # Add adoption classifications to signals
        for signal in signals:
            if signal.get("suppressed"):
                signal["adoption"] = None
                continue

            group_id = signal["group_id"]
            group_size = team_sizes.get(group_id)

            if group_size and signal.get("count") is not None:
                adoption = self.normalizer.classify_adoption_level(
                    count=signal["count"],
                    group_size=group_size
                )
                signal["adoption"] = adoption.to_dict()

        # Define pipeline (just pattern detection for Phase 1)
        steps = [
            AnalysisStep(
                step_id=f"{batch_id}-1-pattern-detection",
                step_type="pattern_detection",
                status=StepStatus.PENDING
            )
        ]

        batch = AnalysisBatch(
            batch_id=batch_id,
            org_id=org_id,
            bucket_start=bucket_start,
            status=BatchStatus.QUEUED,
            signal_aggregates=signals,
            context={"team_sizes": team_sizes},
            steps=steps
        )

        # Save initial state
        self.state_store.save_batch(batch)

        return batch

    def run_batch(self, batch_id: str) -> AnalysisBatch:
        """
        Run pattern detection on a batch

        Returns batch with results or AWAITING_APPROVAL status
        """

        # Load batch
        batch = self.state_store.load_batch(batch_id)
        if not batch:
            raise ValueError(f"Batch {batch_id} not found")

        print(f"\n{'='*60}")
        print(f"Running batch: {batch_id}")
        print(f"{'='*60}\n")

        # Mark as in progress
        batch.status = BatchStatus.IN_PROGRESS
        self.state_store.save_batch(batch)

        try:
            # Execute pattern detection step
            step = batch.steps[0]

            step.mark_started()
            print(f"▶ Step 1/1: Pattern Detection")
            print(f"  Attempt: {step.attempts}/{step.max_attempts}")

            # Call Claude
            result, tokens, cost = self._run_pattern_detection(batch)

            # Check cost budget
            if batch.total_cost_usd + cost > self.max_cost_usd:
                raise Exception(
                    f"Cost budget exceeded: ${batch.total_cost_usd + cost:.2f} > ${self.max_cost_usd}"
                )

            # Check if human review needed
            if self._requires_human_review(result):
                step.mark_requires_human("High-priority anomalies detected")
                batch.status = BatchStatus.AWAITING_APPROVAL
                self.state_store.save_batch(batch)

                print(f"⏸  Paused for human review")
                print(f"  Reason: {step.error}")

                return batch

            # Mark step complete
            step.mark_completed(result, tokens, cost)
            batch.accumulate_cost(cost, tokens)
            batch.advance_step()

            print(f"✓ Pattern Detection Complete")
            print(f"  Patterns found: {len(result.get('patterns_detected', []))}")
            print(f"  Anomalies: {len(result.get('anomalies', []))}")
            print(f"  Tokens: {tokens['input']} in / {tokens['output']} out")
            print(f"  Cost: ${cost:.4f}")

            # Mark batch complete
            batch.status = BatchStatus.COMPLETED
            batch.final_report = result
            self.state_store.save_batch(batch)

            print(f"\n✓ Batch Complete")
            print(f"  Total cost: ${batch.total_cost_usd:.4f}")

            return batch

        except Exception as e:
            step = batch.steps[0]
            step.mark_failed(str(e))
            batch.status = BatchStatus.FAILED
            self.state_store.save_batch(batch)

            print(f"\n✗ Batch Failed")
            print(f"  Error: {e}")

            raise

    def _run_pattern_detection(
        self,
        batch: AnalysisBatch
    ) -> tuple[Dict[str, Any], Dict[str, int], float]:
        """
        Execute pattern detection with Claude

        Returns: (result_dict, tokens_dict, cost_usd)
        """

        # Build prompt
        prompt = self._build_prompt(batch)

        # Call Claude
        print(f"  Calling Claude API...")
        response = self.client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            temperature=0.0,  # Deterministic
            system=self.system_prompt,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse response
        result = self._parse_json_response(response.content[0].text)

        # Extract tokens and calculate cost
        tokens = {
            "input": response.usage.input_tokens,
            "output": response.usage.output_tokens
        }
        cost = self._calculate_cost(tokens)

        return result, tokens, cost

    def _build_prompt(self, batch: AnalysisBatch) -> str:
        """Build the analysis prompt for Claude"""

        # Format signals for prompt
        signals_json = json.dumps(batch.signal_aggregates, indent=2)

        prompt = f"""
Analyze these behavioral signals for week starting {batch.bucket_start}:

CURRENT WEEK SIGNALS:
{signals_json}

Detect patterns and flag anomalies. Return structured JSON output.
"""

        return prompt

    def _requires_human_review(self, result: Dict[str, Any]) -> bool:
        """Check if result requires human review"""

        anomalies = result.get("anomalies", [])
        high_priority = [a for a in anomalies if a.get("priority") == "high"]

        return len(high_priority) > 0

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parse JSON from Claude's response"""

        # Strip markdown fences if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        return json.loads(text.strip())

    def _calculate_cost(self, tokens: Dict[str, int]) -> float:
        """Calculate cost in USD from token usage"""

        # Claude Sonnet 4 pricing (January 2026)
        INPUT_COST_PER_MTOK = 3.00
        OUTPUT_COST_PER_MTOK = 15.00

        input_cost = (tokens["input"] / 1_000_000) * INPUT_COST_PER_MTOK
        output_cost = (tokens["output"] / 1_000_000) * OUTPUT_COST_PER_MTOK

        return input_cost + output_cost
