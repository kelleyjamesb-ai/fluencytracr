import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "dogfood" / "build_ai_manager_outcomes_recommendations_test.py"


def load_builder():
    spec = importlib.util.spec_from_file_location("amor_builder", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def make_summary(*, trust_attributed: float, trust_unattributed: float, motif_scale: float = 1.0):
    """Build a minimal pilot summary the builder can consume.

    motif_scale lets a test shrink every observed pattern below the small-cell
    floor to prove the volume gate can suppress.
    """
    return {
        "motif_totals": {
            "HIGH_VOLUME_ASSISTIVE_SURFACE": 25081 * motif_scale,
            "POST_FRICTION_CONTINUATION": 891 * motif_scale,
            "EXECUTION_LINKED_WORKFLOW": 478 * motif_scale,
            "SEARCH_TO_AGENT_ESCALATION": 442 * motif_scale,
            "WEAK_LINKAGE_CONTEXT": 388 * motif_scale,
            "VERIFICATION_ATTACHED_WORKFLOW": 214 * motif_scale,
        },
        "zone_summary": {
            "SCALE_CANDIDATE": {"cohort": 125100 * motif_scale},
            "TRUST_EVIDENCE_GAP": {"cohort": 6537249 * motif_scale},
        },
        "trust_summary": {
            "TRUST_ATTRIBUTION_STRICT": {"signals": trust_attributed, "attributed": trust_attributed},
            "TRUST_ATTRIBUTION_CROSS_SURFACE_ALIAS": {"signals": trust_unattributed, "attributed": 0.0},
        },
    }


def records_by_id(rows):
    return {row["recommendation_id"]: row for row in rows}


def test_low_trust_attribution_holds_the_trust_dependent_record():
    builder = load_builder()
    # ~11% attributed, mirroring the current pilot: the trust gate must fail.
    summary = make_summary(trust_attributed=380000, trust_unattributed=3100000)
    record = records_by_id(builder.recommendation_records(summary))["AMOR_INTERNAL_003"]

    assert record["recommendation_readiness"] == "TRUST_ATTRIBUTION_HOLD"
    assert "trust_attribution=FAIL" in record["quality_gates"]


def test_recovered_trust_attribution_advances_the_trust_dependent_record():
    builder = load_builder()
    # Majority attributed (e.g. after the verifier-join fix recovers aliased
    # signals): the same record advances to OUTCOME_EVIDENCE_MISSING on its own.
    summary = make_summary(trust_attributed=3100000, trust_unattributed=380000)
    record = records_by_id(builder.recommendation_records(summary))["AMOR_INTERNAL_003"]

    assert record["recommendation_readiness"] == "OUTCOME_EVIDENCE_MISSING"
    assert "trust_attribution=PASS" in record["quality_gates"]


def test_small_cell_volume_suppresses_every_recommendation():
    builder = load_builder()
    # Shrink all patterns below MIN_PATTERN_VOLUME: every record suppresses.
    summary = make_summary(
        trust_attributed=3100000,
        trust_unattributed=380000,
        motif_scale=0.000001,
    )
    rows = builder.recommendation_records(summary)

    suppressed_states = {"HOLD_SMALL_CELL_SUPPRESSED", "NO_OBSERVED_PATTERN"}
    assert all(row["verdict"] == "SUPPRESS" for row in rows)
    assert all(row["recommendation_readiness"] in suppressed_states for row in rows)
    assert all(row["suppression_reason"] == "INSUFFICIENT_VOLUME" for row in rows)


def test_curated_held_states_survive_when_gates_pass():
    builder = load_builder()
    summary = make_summary(trust_attributed=3100000, trust_unattributed=380000)
    rows = records_by_id(builder.recommendation_records(summary))

    assert rows["AMOR_INTERNAL_004"]["recommendation_readiness"] == "FORMULA_REVIEW_REQUIRED"
    assert rows["AMOR_INTERNAL_005"]["recommendation_readiness"] == "SOURCE_COVERAGE_HOLD"
    assert rows["AMOR_INTERNAL_006"]["recommendation_readiness"] == "RESEARCH_ONLY"
