"""
Test with realistic multi-team signal data
"""

import os
from dotenv import load_dotenv
from src.harness import MinimalHarness
from src.state_store import StateStore

def test_wintrust():
    print("Testing with Wintrust Financial data")
    print("=" * 60)

    load_dotenv()

    # Signal data
    signals = [
        {
            "org_id": "org-wintrust-financial",
            "group_id": "team-backend-engineering",
            "group_type": "team",
            "function_id": "function-engineering",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_code_commit",
            "count": 18,
            "tool_class": "coding",
            "suppressed": False,
            "metadata": {
                "has_human_review": True,
                "is_cross_system": False,
                "requires_approval": True
            }
        },
        {
            "org_id": "org-wintrust-financial",
            "group_id": "team-backend-engineering",
            "group_type": "team",
            "function_id": "function-engineering",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_file_update",
            "count": 24,
            "tool_class": "coding",
            "suppressed": False,
            "metadata": {
                "has_human_review": True,
                "is_cross_system": False,
                "requires_approval": False
            }
        },
        {
            "org_id": "org-wintrust-financial",
            "group_id": "team-enterprise-sales",
            "group_type": "team",
            "function_id": "function-sales",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_send_message",
            "count": 47,
            "tool_class": "communication",
            "suppressed": False,
            "metadata": {
                "has_human_review": False,
                "is_cross_system": False,
                "requires_approval": False
            }
        },
        {
            "org_id": "org-wintrust-financial",
            "group_id": "team-enterprise-sales",
            "group_type": "team",
            "function_id": "function-sales",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_record_update",
            "count": 52,
            "tool_class": "crm",
            "suppressed": False,
            "metadata": {
                "has_human_review": True,
                "is_cross_system": False,
                "requires_approval": False
            }
        },
        {
            "org_id": "org-wintrust-financial",
            "group_id": "team-accounts-payable",
            "group_type": "team",
            "function_id": "function-finance",
            "bucket_start": "2026-01-06",
            "signal_name": "delegate_payment_initiate",
            "count": 8,
            "tool_class": "finance",
            "suppressed": False,
            "metadata": {
                "has_human_review": True,
                "is_cross_system": True,
                "requires_approval": True
            }
        }
    ]

    # Team sizes for adoption calculation
    team_sizes = {
        "team-backend-engineering": 25,
        "team-enterprise-sales": 60,
        "team-accounts-payable": 12
    }

    # Initialize harness
    harness = MinimalHarness(
        anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
        state_store=StateStore("./data/batches"),
        max_cost_usd=1.0
    )

    # Create and run batch
    batch = harness.create_batch(
        org_id="org-wintrust-financial",
        bucket_start="2026-01-06",
        signals=signals,
        team_sizes=team_sizes
    )

    # Show adoption classifications
    print("\nAdoption Classifications:")
    print("-" * 40)
    for signal in batch.signal_aggregates:
        if signal.get("adoption"):
            a = signal["adoption"]
            print(f"  {signal['group_id']}/{signal['signal_name']}:")
            print(f"    {a['penetration_pct']}% → {a['level'].upper()}")

    # Run analysis
    batch = harness.run_batch(batch.batch_id)

    # Show results
    if batch.final_report:
        print("\n" + "=" * 60)
        print("ANALYSIS RESULTS")
        print("=" * 60)

        import json
        print(json.dumps(batch.final_report, indent=2))

if __name__ == "__main__":
    test_wintrust()
