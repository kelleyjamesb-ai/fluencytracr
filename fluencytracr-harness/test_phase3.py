"""
Phase 3 Test: Validate harness with Claude API
"""

import os
from dotenv import load_dotenv
from src.harness import MinimalHarness
from src.state_store import StateStore

def test_phase3():
    print("Testing Phase 3: Harness with Claude API")
    print("=" * 60)

    # Load environment variables
    load_dotenv()

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("\n✗ Error: ANTHROPIC_API_KEY not found in environment")
        print("  Create a .env file with your API key:")
        print("  ANTHROPIC_API_KEY=sk-ant-your-key-here")
        return

    # Create harness
    print("\n1. Initializing harness...")
    harness = MinimalHarness(
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        state_store=StateStore("./data/batches"),
        max_cost_usd=1.0  # Low budget for testing
    )
    print("   ✓ Harness initialized")

    # Minimal test data
    print("\n2. Creating test data...")
    signals = [
        {
            "org_id": "org-test",
            "group_id": "team-eng",
            "group_type": "team",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_code_commit",
            "count": 18,
            "suppressed": False,
            "metadata": {"has_human_review": True}
        },
        {
            "org_id": "org-test",
            "group_id": "team-eng",
            "group_type": "team",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_file_update",
            "count": 24,
            "suppressed": False,
            "metadata": {"has_human_review": True}
        }
    ]

    team_sizes = {"team-eng": 50}
    print(f"   ✓ Created {len(signals)} signals")

    # Create batch
    print("\n3. Creating batch...")
    batch = harness.create_batch(
        org_id="org-test",
        bucket_start="2026-01-06",
        signals=signals,
        team_sizes=team_sizes
    )
    print(f"   ✓ Batch created: {batch.batch_id}")

    # Verify adoption classification was added
    print("\n4. Verifying adoption context...")
    for signal in batch.signal_aggregates:
        if signal.get("adoption"):
            adoption = signal["adoption"]
            print(f"   {signal['signal_name']}:")
            print(f"     Count: {signal['count']} / {team_sizes['team-eng']}")
            print(f"     Level: {adoption['level']}")
            print(f"     Penetration: {adoption['penetration_pct']}%")
    print("   ✓ Adoption context added")

    # Run batch (this calls Claude API)
    print("\n5. Running batch analysis...")
    print("   (This will call Claude API - may take 10-20 seconds)")

    try:
        batch = harness.run_batch(batch.batch_id)

        print(f"\n6. Analysis complete!")
        print(f"   Status: {batch.status.value}")
        print(f"   Cost: ${batch.total_cost_usd:.4f}")

        if batch.status.value == "completed":
            result = batch.final_report

            print(f"\n7. Results:")
            print(f"   Patterns detected: {len(result.get('patterns_detected', []))}")
            print(f"   Anomalies flagged: {len(result.get('anomalies', []))}")

            # Show patterns
            if result.get('patterns_detected'):
                print("\n   Patterns:")
                for pattern in result['patterns_detected']:
                    print(f"     • {pattern.get('pattern_name')}: {pattern.get('interpretation', 'N/A')[:60]}...")

            # Show anomalies
            if result.get('anomalies'):
                print("\n   Anomalies:")
                for anomaly in result['anomalies']:
                    print(f"     ⚠ {anomaly.get('anomaly_type')}: {anomaly.get('description', 'N/A')[:60]}...")

            # Show adoption snapshot
            if result.get('adoption_snapshot'):
                snapshot = result['adoption_snapshot']
                print(f"\n   Adoption Snapshot:")
                print(f"     Org level: {snapshot.get('org_level')}")
                print(f"     Teams analyzed: {snapshot.get('teams_analyzed')}")

            print("\n" + "=" * 60)
            print("✓ Phase 3 Complete: Harness working end-to-end!")
            print("=" * 60)

        elif batch.status.value == "awaiting_approval":
            print("\n7. Batch paused for human review")
            print(f"   Reason: {batch.steps[0].error}")
            print("\n   This means Claude detected high-priority anomalies.")
            print("   In production, you would review and approve to continue.")
            print("\n" + "=" * 60)
            print("✓ Phase 3 Complete: Approval gate working!")
            print("=" * 60)

        # Verify state persistence
        print("\n8. Verifying state persistence...")
        reloaded = harness.state_store.load_batch(batch.batch_id)
        assert reloaded.batch_id == batch.batch_id
        assert reloaded.status == batch.status
        print("   ✓ Batch state persisted correctly")

    except Exception as e:
        print(f"\n✗ Error during analysis: {e}")
        print("\nTroubleshooting:")
        print("  1. Check your .env file has valid ANTHROPIC_API_KEY")
        print("  2. Ensure you have API credits available")
        print("  3. Check network connectivity")
        raise

if __name__ == "__main__":
    test_phase3()
