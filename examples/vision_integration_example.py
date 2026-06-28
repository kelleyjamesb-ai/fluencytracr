"""Example: Integrating Vision Module with vision quality metrics.

This script demonstrates how to use the Vision Intelligence Module to apply
environmental penalties to legacy quality scores based on detected visual distractions.

Usage:
    python examples/vision_integration_example.py

Requirements:
    - opencv-python >= 4.8.0
    - numpy >= 1.24.0
    - Working webcam (optional - can use static images)
"""

from datetime import datetime, timedelta, timezone

from src.events import EnablementEvent
from src.fluency_service import calculate_fluency_with_suppression
from src.passive_signals import SignalEvent
from vision.fluency_bridge import VisionQualityBridge
from vision.visual_engine import SpotTracker


def example_with_static_image():
    """Example: Calculate fluency with environmental penalty from static image."""
    print("=" * 80)
    print("Example 1: Static Image Analysis")
    print("=" * 80)

    # Initialize vision tracker
    tracker = SpotTracker(threshold_value=200, min_area=10)
    bridge = VisionQualityBridge(tracker)

    # Note: Replace with actual image path if you want to test with real images
    # For this example, we'll simulate detection results

    # Simulate detection result (in production, use tracker.detect_spots_from_image())
    from vision.visual_engine import BrightSpot, SpotDetectionResult

    # Scenario 1: Clean environment (no bright spots)
    clean_result = SpotDetectionResult(spots=[], total_spots=0, total_area=0.0)
    penalty_clean = bridge.calculate_environmental_penalty(clean_result)

    print(f"\nClean Environment:")
    print(f"  Spots Detected: {penalty_clean.spot_count}")
    print(f"  Penalty Factor: {penalty_clean.penalty_factor}")
    print(f"  Penalty: {penalty_clean.penalty_percentage:.1f}%")
    print(f"  Reason: {penalty_clean.reason}")

    # Scenario 2: Moderate distraction (some bright spots)
    moderate_spots = [
        BrightSpot(x=100, y=100, area=200.0, timestamp=datetime.now(timezone.utc).isoformat()),
        BrightSpot(x=300, y=300, area=300.0, timestamp=datetime.now(timezone.utc).isoformat()),
        BrightSpot(x=500, y=500, area=250.0, timestamp=datetime.now(timezone.utc).isoformat()),
    ]
    moderate_result = SpotDetectionResult(
        spots=moderate_spots, total_spots=3, total_area=750.0
    )
    penalty_moderate = bridge.calculate_environmental_penalty(moderate_result)

    print(f"\nModerate Distraction:")
    print(f"  Spots Detected: {penalty_moderate.spot_count}")
    print(f"  Total Area: {penalty_moderate.total_area:.0f} pixels")
    print(f"  Penalty Factor: {penalty_moderate.penalty_factor:.3f}")
    print(f"  Penalty: {penalty_moderate.penalty_percentage:.1f}%")
    print(f"  Reason: {penalty_moderate.reason}")

    # Scenario 3: High distraction (many large bright spots)
    high_spots = [
        BrightSpot(x=i * 50, y=i * 50, area=1000.0, timestamp=datetime.now(timezone.utc).isoformat())
        for i in range(20)
    ]
    high_result = SpotDetectionResult(
        spots=high_spots, total_spots=20, total_area=20000.0
    )
    penalty_high = bridge.calculate_environmental_penalty(high_result)

    print(f"\nHigh Distraction:")
    print(f"  Spots Detected: {penalty_high.spot_count}")
    print(f"  Total Area: {penalty_high.total_area:.0f} pixels")
    print(f"  Penalty Factor: {penalty_high.penalty_factor:.3f}")
    print(f"  Penalty: {penalty_high.penalty_percentage:.1f}%")
    print(f"  Reason: {penalty_high.reason}")


def example_with_fluency_calculation():
    """Example: Calculate fluency index with environmental penalty applied."""
    print("\n" + "=" * 80)
    print("Example 2: Fluency Index with Environmental Penalty")
    print("=" * 80)

    # Create sample team data
    now = datetime.now(timezone.utc)
    team_id = "engineering-team-1"
    roster_size = 15

    # Sample signal events (team activity)
    signals = [
        SignalEvent(
            source="code_review",
            occurred_at=now - timedelta(days=i),
            org_id="org-1",
            team_id=team_id,
            role_id=f"user-{i}",
            signal_type="autocomplete" if i % 2 == 0 else "refactor",
            metadata={},
        )
        for i in range(20)
    ]

    # Sample enablement events (training)
    enablement_events = [
        EnablementEvent(
            event_type="session_attended",
            occurred_at=now - timedelta(days=30),
            org_id="org-1",
            team_id=team_id,
            role_id=f"user-{i}",
        )
        for i in range(10)
    ]

    # Calculate fluency WITHOUT environmental penalty
    result_no_penalty = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=roster_size,
        min_group_size=3,
        all_signals=signals,
        all_enablement_events=enablement_events,
        policy_acknowledgment_rate=0.9,
        reference_date=now,
        environmental_penalty=1.0,  # No penalty
    )

    print(f"\nFluency WITHOUT Environmental Penalty:")
    print(f"  Team ID: {result_no_penalty.team_id}")
    print(f"  Fluency Index: {result_no_penalty.fluency_index:.4f}")
    print(f"  Coverage (C): {result_no_penalty.coverage:.4f}")
    print(f"  Depth (D): {result_no_penalty.depth:.4f}")
    print(f"  Judgment (J): {result_no_penalty.judgment:.4f}")
    print(f"  Velocity (V): {result_no_penalty.velocity:.4f}")
    print(f"  Environmental (E): {result_no_penalty.environmental_penalty:.4f}")

    # Calculate fluency WITH environmental penalty (moderate distraction)
    result_with_penalty = calculate_fluency_with_suppression(
        team_id=team_id,
        roster_size=roster_size,
        min_group_size=3,
        all_signals=signals,
        all_enablement_events=enablement_events,
        policy_acknowledgment_rate=0.9,
        reference_date=now,
        environmental_penalty=0.85,  # 15% penalty
    )

    print(f"\nFluency WITH Environmental Penalty (15%):")
    print(f"  Team ID: {result_with_penalty.team_id}")
    print(f"  Fluency Index: {result_with_penalty.fluency_index:.4f}")
    print(f"  Coverage (C): {result_with_penalty.coverage:.4f}")
    print(f"  Depth (D): {result_with_penalty.depth:.4f}")
    print(f"  Judgment (J): {result_with_penalty.judgment:.4f}")
    print(f"  Velocity (V): {result_with_penalty.velocity:.4f}")
    print(f"  Environmental (E): {result_with_penalty.environmental_penalty:.4f}")

    # Show impact
    base_score = result_no_penalty.fluency_index
    adjusted_score = result_with_penalty.fluency_index
    impact = ((base_score - adjusted_score) / base_score) * 100

    print(f"\nImpact Analysis:")
    print(f"  Base Score: {base_score:.4f}")
    print(f"  Adjusted Score: {adjusted_score:.4f}")
    print(f"  Reduction: {impact:.1f}%")


def example_integration_pattern():
    """Example: Complete integration pattern for production use."""
    print("\n" + "=" * 80)
    print("Example 3: Production Integration Pattern")
    print("=" * 80)

    print("""
Production Integration Steps:

1. Initialize Vision Tracker (one-time setup):

   from vision.visual_engine import SpotTracker
   from vision.fluency_bridge import VisionQualityBridge

   tracker = SpotTracker(
       threshold_value=200,    # Brightness threshold
       min_area=10,            # Minimum spot size
       blur_kernel=(11, 11),   # Smoothing kernel
   )
   bridge = VisionQualityBridge(tracker)

2. Start Monitoring (daemon thread):

   tracker.start_monitoring(
       camera_index=0,         # Default webcam
       poll_interval=0.5,      # Check every 500ms
   )

3. Calculate Fluency with Environmental Penalty:

   # Get latest environmental penalty
   penalty = bridge.calculate_environmental_penalty()

   # Calculate fluency with penalty
   result = calculate_fluency_with_suppression(
       team_id=team_id,
       roster_size=roster_size,
       min_group_size=min_group_size,
       all_signals=signals,
       all_enablement_events=events,
       policy_acknowledgment_rate=policy_rate,
       environmental_penalty=penalty.penalty_factor,  # Apply vision penalty
   )

4. Monitor Status:

   status = bridge.get_status()
   print(f"Monitoring: {status['monitoring_active']}")
   print(f"Latest Penalty: {status['penalty_percentage']:.1f}%")
   print(f"Reason: {status['reason']}")

5. Cleanup (on shutdown):

   tracker.stop_monitoring()

Key Benefits:
- Runs in daemon thread (non-blocking)
- Thread-safe (can call from multiple threads)
- Automatic penalty capping (max 30% reduction)
- Human-readable explanations
- Optional: can be disabled by setting environmental_penalty=1.0
    """)


if __name__ == "__main__":
    # Run all examples
    example_with_static_image()
    example_with_fluency_calculation()
    example_integration_pattern()

    print("\n" + "=" * 80)
    print("Examples Complete!")
    print("=" * 80)
    print("\nNext Steps:")
    print("1. Test with real webcam: tracker.start_monitoring(camera_index=0)")
    print("2. Test with static images: tracker.detect_spots_from_image('path/to/image.jpg')")
    print("3. Integrate into your application using the patterns above")
    print("4. Monitor environmental penalties in production dashboards")
