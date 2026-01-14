#!/usr/bin/env python3
"""
Example: Run FluencyTracr Harness on sample data

Usage:
    python example_run.py
"""

import json
import os
from dotenv import load_dotenv

from src.harness import MinimalHarness
from src.state_store import StateStore


def main():
    print("\n" + "="*60)
    print("FluencyTracr Harness - Example Run")
    print("="*60)

    # Load environment variables
    load_dotenv()

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("\n✗ Error: ANTHROPIC_API_KEY not found")
        print("\nPlease create a .env file with your API key:")
        print("  ANTHROPIC_API_KEY=sk-ant-your-key-here\n")
        return 1

    # Initialize harness
    print("\nInitializing harness...")
    harness = MinimalHarness(
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        state_store=StateStore(base_path="./data/batches"),
        max_cost_usd=5.0
    )
    print("✓ Harness ready")

    # Load sample data
    print("\nLoading sample data...")
    with open("data/sample_signals.json", 'r') as f:
        signals = json.load(f)
    print(f"✓ Loaded {len(signals)} signals")

    # Define team sizes (required for adoption normalization)
    team_sizes = {
        "team-backend-engineering": 50,
        "team-enterprise-sales": 25,
        "team-accounts-payable": 12
    }
    print(f"✓ Team sizes defined for {len(team_sizes)} teams")

    # Create batch
    batch = harness.create_batch(
        org_id="org-wintrust-financial",
        bucket_start="2026-01-06",
        signals=signals,
        team_sizes=team_sizes
    )

    print(f"\n✓ Created batch: {batch.batch_id}")

    # Show adoption context
    print("\nAdoption Context:")
    for signal in batch.signal_aggregates:
        if signal.get("adoption"):
            adoption = signal["adoption"]
            print(f"  {signal['group_id']}:")
            print(f"    {signal['signal_name']}: {signal['count']} → {adoption['level'].upper()} ({adoption['penetration_pct']}%)")

    # Run analysis
    print("\nRunning analysis (this calls Claude API)...")
    print("This may take 15-30 seconds...\n")

    try:
        batch = harness.run_batch(batch.batch_id)

        if batch.status.value == "completed":
            print("\n" + "="*60)
            print("ANALYSIS COMPLETE")
            print("="*60 + "\n")

            # Print results
            result = batch.final_report

            print("PATTERNS DETECTED:")
            patterns = result.get("patterns_detected", [])
            if patterns:
                for pattern in patterns:
                    print(f"  • {pattern['pattern_name']}")
                    print(f"    Confidence: {pattern.get('confidence', 'N/A')}")
                    print(f"    Groups: {', '.join(pattern.get('groups_affected', []))}")
                    print(f"    {pattern.get('interpretation', '')}")
                    print()
            else:
                print("  (none detected)")

            print("\nANOMALIES:")
            anomalies = result.get("anomalies", [])
            if anomalies:
                for anomaly in anomalies:
                    priority_icon = "🔴" if anomaly.get('priority') == 'high' else "⚠️"
                    print(f"  {priority_icon} {anomaly['anomaly_type']}")
                    print(f"    Signal: {anomaly.get('signal_name', 'N/A')}")
                    print(f"    Group: {anomaly.get('group_id', 'N/A')}")
                    print(f"    Priority: {anomaly.get('priority', 'N/A').upper()}")
                    print(f"    {anomaly.get('description', '')}")
                    print()
            else:
                print("  (none detected)")

            print("\nADOPTION SNAPSHOT:")
            snapshot = result.get("adoption_snapshot", {})
            if snapshot:
                print(f"  Org level: {snapshot.get('org_level', 'N/A').upper()}")
                print(f"  Org penetration: {snapshot.get('org_penetration_pct', 'N/A')}%")
                print(f"  Teams analyzed: {snapshot.get('teams_analyzed', 'N/A')}")

                teams_by_level = snapshot.get('teams_by_level', {})
                if teams_by_level:
                    print(f"  Teams by level:")
                    for level, count in teams_by_level.items():
                        if count > 0:
                            print(f"    {level.upper()}: {count}")

            print("\n" + "="*60)
            print(f"Cost: ${batch.total_cost_usd:.4f}")
            print(f"Tokens: {batch.total_tokens['input']} in / {batch.total_tokens['output']} out")
            print("="*60 + "\n")

            return 0

        elif batch.status.value == "awaiting_approval":
            print("\n" + "="*60)
            print("AWAITING HUMAN REVIEW")
            print("="*60 + "\n")
            print("Reason:", batch.steps[0].error)
            print("\nHigh-priority anomalies were detected.")
            print("In production, a human would review these before continuing.")
            print("\nTo see what was flagged, check the batch state file:")
            print(f"  data/batches/{batch.batch_id}.json")
            print()
            return 0

    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your .env file has valid ANTHROPIC_API_KEY")
        print("  2. Ensure you have API credits")
        print("  3. Check network connectivity")
        return 1


if __name__ == "__main__":
    exit(main())
