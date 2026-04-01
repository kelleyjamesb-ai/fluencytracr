"""
Phase 2 Test: Validate adoption framework
"""

from src.adoption_normalizer import AdoptionCurveNormalizer

def test_phase2():
    print("Testing Phase 2: Adoption Framework")
    print("=" * 60)

    normalizer = AdoptionCurveNormalizer()

    # Test Case 1: Small team, high adoption (SATURATED)
    print("\n1. Test Case: Small team (20), high count (18)")
    result = normalizer.classify_adoption_level(count=18, group_size=20)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    print(f"   Segment: {result.segment}")
    assert result.level == "saturated", f"Expected 'saturated', got '{result.level}'"
    assert result.penetration_pct == 90.0, f"Expected 90.0%, got {result.penetration_pct}%"
    print("   ✓ Correctly classified as SATURATED")

    # Test Case 2: Large team, just crossed chasm (MEDIUM)
    print("\n2. Test Case: Large team (100), crossed chasm (18)")
    result = normalizer.classify_adoption_level(count=18, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    print(f"   Segment: {result.segment}")
    assert result.level == "medium", f"Expected 'medium', got '{result.level}'"
    assert result.penetration_pct == 18.0, f"Expected 18.0%, got {result.penetration_pct}%"
    print("   ✓ Correctly classified as MEDIUM")

    # Test Case 3: Early adoption (LOW)
    print("\n3. Test Case: Large team (100), early adoption (10)")
    result = normalizer.classify_adoption_level(count=10, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    print(f"   Segment: {result.segment}")
    assert result.level == "low", f"Expected 'low', got '{result.level}'"
    assert result.penetration_pct == 10.0, f"Expected 10.0%, got {result.penetration_pct}%"
    print("   ✓ Correctly classified as LOW")

    # Test Case 4: Late majority (HIGH)
    print("\n4. Test Case: Large team (100), late majority (60)")
    result = normalizer.classify_adoption_level(count=60, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    print(f"   Segment: {result.segment}")
    assert result.level == "high", f"Expected 'high', got '{result.level}'"
    assert result.penetration_pct == 60.0, f"Expected 60.0%, got {result.penetration_pct}%"
    print("   ✓ Correctly classified as HIGH")

    # Test Case 5: Boundary test - exactly at 16%
    print("\n5. Test Case: Boundary at 16% (16 of 100)")
    result = normalizer.classify_adoption_level(count=16, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    assert result.level == "medium", f"Expected 'medium' at 16%, got '{result.level}'"
    print("   ✓ Correctly classified as MEDIUM (crossed 16% threshold)")

    # Test Case 6: Boundary test - exactly at 50%
    print("\n6. Test Case: Boundary at 50% (50 of 100)")
    result = normalizer.classify_adoption_level(count=50, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    assert result.level == "high", f"Expected 'high' at 50%, got '{result.level}'"
    print("   ✓ Correctly classified as HIGH (crossed 50% threshold)")

    # Test Case 7: Boundary test - exactly at 84%
    print("\n7. Test Case: Boundary at 84% (84 of 100)")
    result = normalizer.classify_adoption_level(count=84, group_size=100)
    print(f"   Penetration: {result.penetration_pct}%")
    print(f"   Level: {result.level}")
    assert result.level == "saturated", f"Expected 'saturated' at 84%, got '{result.level}'"
    print("   ✓ Correctly classified as SATURATED (crossed 84% threshold)")

    # Test interpretation content
    print("\n8. Verifying interpretation quality...")
    result = normalizer.classify_adoption_level(count=25, group_size=100)
    assert "chasm" in result.interpretation.lower(), "Interpretation should mention 'chasm'"
    assert result.statistical_note, "Statistical note should not be empty"
    print("   ✓ Interpretation includes relevant context")

    # Test to_dict serialization
    print("\n9. Testing serialization...")
    result = normalizer.classify_adoption_level(count=30, group_size=100)
    result_dict = result.to_dict()
    assert "level" in result_dict, "Serialized dict missing 'level'"
    assert "penetration_pct" in result_dict, "Serialized dict missing 'penetration_pct'"
    assert "interpretation" in result_dict, "Serialized dict missing 'interpretation'"
    print("   ✓ Serialization working correctly")

    print("\n" + "=" * 60)
    print("✓ Phase 2 Complete: All adoption tests passed!")
    print("=" * 60)

    # Visual summary of thresholds
    print("\n📊 Adoption Framework Summary:")
    print("   0% ────── 16% ────── 50% ────── 84% ────── 100%")
    print("      LOW      MEDIUM      HIGH      SATURATED")
    print("   Pre-chasm  Crossed    Late       Laggards")
    print("              Chasm!    Majority")

if __name__ == "__main__":
    test_phase2()
