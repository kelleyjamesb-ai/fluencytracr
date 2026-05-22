"""Example customer-owned Airflow DAG for FluencyTracr V3 ingest.

Runs the transformer inside the customer's environment and posts only aggregate
JSON payloads to FluencyTracr.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator


with DAG(
    dag_id="fluencytracr_v3_aggregate_ingest",
    start_date=datetime(2026, 5, 22),
    schedule="@daily",
    catchup=False,
    default_args={"retries": 1, "retry_delay": timedelta(minutes=10)},
) as dag:
    transform = BashOperator(
        task_id="transform_gce_to_aggregates",
        bash_command=(
            "python /opt/fluencytracr/transformer/glean_gce_transformer.py "
            "--project {{ var.value.gce_project }} "
            "--dataset {{ var.value.gce_dataset }} "
            "--table {{ var.value.gce_table }} "
            "--window-start {{ ds }}T00:00:00Z "
            "--window-end {{ next_ds }}T00:00:00Z "
            "--cohort-id {{ var.value.fluencytracr_cohort_id }} "
            "--calibration-id scio-prod-60d-2026-05 "
            "--output-dir /tmp/fluencytracr-v3"
        ),
    )

    post = BashOperator(
        task_id="post_aggregate_payloads",
        bash_command=(
            "for payload in /tmp/fluencytracr-v3/*.json; do "
            "curl -fsS -X POST \"$FLUENCYTRACR_URL/api/v3/ingest/aggregate\" "
            "-H 'Content-Type: application/json' "
            "-H 'x-role: ADMIN' "
            "-H \"x-org-id: $FLUENCYTRACR_ORG_ID\" "
            "--data-binary \"@$payload\"; "
            "done"
        ),
    )

    transform >> post
