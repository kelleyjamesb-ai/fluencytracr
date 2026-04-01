"""
Phase 1 Test: Validate data models and state store
"""

from src.models import AnalysisBatch, AnalysisStep, BatchStatus, StepStatus
from src.state_store import StateStore

def test_phase1():
    print("Testing Phase 1: Data Models & State Store")
    print("=" * 60)

    # Test 1: Create a batch
    print("\n1. Creating batch...")
    batch = AnalysisBatch(
        batch_id="test-batch-1",
        org_id="org-test",
        bucket_start="2026-01-06",
        status=BatchStatus.QUEUED,
        signal_aggregates=[
            {
                "group_id": "team-1",
                "signal_name": "delegate_code_commit",
                "count": 10
            }
        ]
    )
    print(f"   ✓ Created batch: {batch.batch_id}")
    print(f"   ✓ Status: {batch.status.value}")
    print(f"   ✓ Signals: {len(batch.signal_aggregates)}")

    # Test 2: Save batch
    print("\n2. Saving batch...")
    store = StateStore("./data/batches")
    store.save_batch(batch)

    # Test 3: Load batch
    print("\n3. Loading batch...")
    loaded = store.load_batch("test-batch-1")

    # Test 4: Verify data
    print("\n4. Verifying data...")
    assert loaded is not None, "Batch not found"
    assert loaded.batch_id == batch.batch_id, "Batch ID mismatch"
    assert loaded.org_id == batch.org_id, "Org ID mismatch"
    assert loaded.status == batch.status, "Status mismatch"
    assert len(loaded.signal_aggregates) == len(batch.signal_aggregates), "Signals mismatch"
    print("   ✓ All data matches!")

    # Test 5: Update batch
    print("\n5. Updating batch status...")
    batch.status = BatchStatus.IN_PROGRESS
    store.save_batch(batch)

    loaded = store.load_batch("test-batch-1")
    assert loaded.status == BatchStatus.IN_PROGRESS, "Status update failed"
    print("   ✓ Status updated successfully")

    # Test 6: Add a step
    print("\n6. Adding analysis step...")
    step = AnalysisStep(
        step_id="test-batch-1-step-1",
        step_type="pattern_detection",
        status=StepStatus.PENDING
    )
    batch.steps.append(step)
    store.save_batch(batch)

    loaded = store.load_batch("test-batch-1")
    assert len(loaded.steps) == 1, "Step not added"
    print("   ✓ Step added successfully")

    # Test 7: List batches
    print("\n7. Listing batches...")
    batches = store.list_batches()
    print(f"   ✓ Found {len(batches)} batch(es)")

    print("\n" + "=" * 60)
    print("✓ Phase 1 Complete: All tests passed!")
    print("=" * 60)

if __name__ == "__main__":
    test_phase1()
