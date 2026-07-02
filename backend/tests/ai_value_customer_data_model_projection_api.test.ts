import request from "supertest";

import { app } from "../src/app";
import { store, type AiValueCustomerDataModelSnapshotStoredRecord } from "../src/store";

const ORG_ID = "org-northstar-enterprise";
const OTHER_ORG_ID = "org-other";
const readAuth = { "x-role": "EXEC_VIEWER", "x-org-id": ORG_ID };
const otherOrgReadAuth = { "x-role": "EXEC_VIEWER", "x-org-id": OTHER_ORG_ID };
const measurementPlanId = "measurement_plan_customer_support_2026_05";

const customerDataModelSnapshot = (
  overrides: Partial<AiValueCustomerDataModelSnapshotStoredRecord> = {}
): AiValueCustomerDataModelSnapshotStoredRecord => ({
  id: "db_row_do_not_expose",
  org_id: ORG_ID,
  client_id: "client_internal_do_not_expose",
  customer_data_model_snapshot_id:
    "customer_data_model_snapshot:org-northstar-enterprise:measurement_cell_support_day_30",
  source_snapshot_id: "measurement_cell_snapshot_support_day_30",
  source_projection_id: "measurement_cell_projection_support_day_30",
  source_projection_hash: "a".repeat(64),
  source_gate_id: "customer_data_model_gate_support_day_30",
  source_gate_hash: "b".repeat(64),
  source_promotion_decision_id: "customer_data_model_promotion_support_day_30",
  source_promotion_decision_hash: "c".repeat(64),
  implementation_decision_id: "customer_data_model_implementation_support_day_30",
  implementation_decision_hash: "d".repeat(64),
  measurement_cell_id: "measurement_cell_support_day_30",
  measurement_cell_assembly_run_id: "assembly_run_internal_do_not_expose",
  measurement_plan_id: measurementPlanId,
  value_hypothesis_id: "value_hypothesis_support_capacity",
  value_hypothesis_ref: "value_hypothesis_ref_support_capacity",
  value_hypothesis_binding_state: "bound",
  approved_blueprint_ref: "approved_blueprint_support_capacity",
  approved_blueprint_payload_hash: "e".repeat(64),
  blueprint_expectation_ref: "blueprint_expectation_support_resolution",
  expectation_path_id: "expectation_path_support_resolution",
  expectation_path_version: 1,
  expectation_path_hash: "f".repeat(64),
  approval_state: "approved",
  approved_at: "2026-06-24T00:00:00.000Z",
  approved_by_role: "value_realization_pm",
  value_driver: "Capacity",
  metric_id: "support_median_resolution_hours",
  metric_definition_ref: "metric_definition_support_resolution",
  metric_definition_hash: "1".repeat(64),
  metric_owner_approval_state: "approved",
  metric_direction: "decrease",
  metric_unit: "hours",
  expected_metric_lag_days: 30,
  workflow_family: "customer_support_case_resolution",
  workflow_id: "workflow_support_case_resolution",
  function_area: "Customer Support",
  cohort_key: "function:customer_support",
  window_mode: "milestone",
  milestone_day: 30,
  baseline_window_start: "2026-02-01",
  baseline_window_end: "2026-03-31",
  comparison_window_start: "2026-04-01",
  comparison_window_end: "2026-05-31",
  aggregate_source_system: "bigquery_export",
  aggregate_export_review_ref: "aggregate_review_support_day_30",
  aggregate_export_review_state: "passed_review",
  aggregate_source_export_ref: "source_export_support_day_30",
  aggregate_export_review_hash: "2".repeat(64),
  pipeline_dry_run_ref: "pipeline_dry_run_support_day_30",
  pipeline_boundary_hash: "3".repeat(64),
  source_refs: {
    vbd_source_ref: "vbd_probe_support_day_30",
    token_source_ref: "token_probe_support_day_30",
    operator_internal_ref: "internal_ref_do_not_expose"
  },
  aggregate_boundary_ref: {
    source_inventory_manifest_ref: "source_inventory_support_day_30",
    aggregate_extraction_manifest_ref: "aggregate_extraction_support_day_30",
    pipeline_run_review_manifest_ref: "pipeline_review_support_day_30"
  },
  assembly_decision: "READY_FOR_VALUE_HYPOTHESIS_PACKET_RUNNER",
  validation_valid: true,
  assembly_validation_valid: true,
  validation_gap_count: 0,
  assembly_validation_gap_count: 0,
  required_caveats: [
    "Aggregate evidence status only; customer-owned outcome review remains required."
  ],
  blocked_uses: [
    "realized_roi",
    "finance_output",
    "causality_claim",
    "productivity_claim",
    "confidence_output",
    "probability_output",
    "score_output",
    "live_bigquery_execution",
    "live_sigma_execution",
    "customer_facing_financial_output"
  ],
  version: 1,
  supersedes_id: null,
  generated_at: "2026-06-25T18:30:00.000Z",
  created_at: "2026-06-25T18:31:00.000Z",
  created_by_role: "value_realization_pm",
  ...overrides
});

const seedCustomerSnapshot = (record: AiValueCustomerDataModelSnapshotStoredRecord) => {
  store.aiValueCustomerDataModelSnapshots.set(
    `${record.org_id}:${record.customer_data_model_snapshot_id}:${record.version}`,
    record
  );
};

describe("AI value customer data model projection API", () => {
  beforeEach(() => {
    store.reset();
  });

  it("returns a fail-closed empty projection when no compact snapshots exist", async () => {
    const response = await request(app)
      .get("/api/v1/ai-value/customer-data-model/projections")
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toContain("no-store");
    expect(response.headers["x-ai-value-customer-projection-boundary"]).toBe(
      "source_bound_customer_data_model_projection"
    );
    expect(response.headers["x-ai-value-live-connectors"]).toBe("false");
    expect(response.body).toMatchObject({
      schema_version: "FT_AI_VALUE_CUSTOMER_DATA_MODEL_ROUTE_PROJECTION_2026_06",
      projection_state: "HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS",
      display_mode: "customer_evidence_status",
      source_bound: true,
      filter_applied: "latest_org_scoped",
      live_connector_execution: false,
      projections: []
    });
    expect(response.body.boundary.live_bigquery_execution).toBe(false);
    expect(response.body.boundary.live_sigma_execution).toBe(false);
    expect(response.body.boundary.raw_or_identity_data).toBe(false);
    expect(response.body.customer_visible).toBeUndefined();
    expect(response.body.measurement_plan_id).toBeUndefined();
  });

  it("returns latest compact customer projections without exposing stored rows or unsafe feeds", async () => {
    seedCustomerSnapshot(customerDataModelSnapshot());
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        id: "db_row_version_2_do_not_expose",
        version: 2,
        supersedes_id: "db_row_do_not_expose",
        milestone_day: 60,
        comparison_window_start: "2026-05-01",
        comparison_window_end: "2026-06-30",
        generated_at: "2026-06-25T20:30:00.000Z"
      })
    );

    const response = await request(app)
      .get("/api/v1/ai-value/customer-data-model/projections")
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.body.projection_state).toBe(
      "SOURCE_BOUND_CUSTOMER_EVIDENCE_STATUS_READY"
    );
    expect(response.body.projections).toHaveLength(1);
    expect(Object.keys(response.body.projections[0]).sort()).toEqual(
      [
        "allowed_output",
        "blocked_outputs",
        "caveats",
        "evidence_status",
        "metric",
        "milestone",
        "next_action",
        "value_driver",
        "workflow_context"
      ].sort()
    );
    expect(response.body.projections[0]).toMatchObject({
      value_driver: "Capacity",
      metric: {
        label: "Capacity metric",
        direction: "decrease",
        unit: "hours",
        owner_review_state: "Metric owner approved"
      },
      workflow_context: {
        function_area: "Customer Support",
        workflow_label: "Customer Support workflow"
      },
      milestone: {
        day: 60,
        baseline_window: { start: "2026-02-01", end: "2026-03-31" },
        comparison_window: { start: "2026-05-01", end: "2026-06-30" }
      },
      evidence_status: {
        aggregate_review_state: "Aggregate export review passed",
        validation_state: "clear"
      },
      allowed_output: "Aggregate evidence status only"
    });
    expect(response.body.projections[0].source_refs).toBeUndefined();
    expect(response.body.projections[0].aggregate_boundary_ref).toBeUndefined();
    expect(response.body.projections[0].blocked_outputs).toContain("ROI proof");
    expect(response.body.projections[0].blocked_outputs).toContain("Live connector output");
    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("db_row_do_not_expose");
    expect(serialized).not.toContain("db_row_version_2_do_not_expose");
    expect(serialized).not.toContain("client_internal_do_not_expose");
    expect(serialized).not.toContain("assembly_run_internal_do_not_expose");
    expect(serialized).not.toContain("operator_internal_ref");
    expect(serialized).not.toContain("org-northstar-enterprise");
    expect(serialized).not.toContain("customer_data_model_snapshot");
    expect(serialized).not.toContain("measurement_cell");
    expect(serialized).not.toContain("source_projection");
    expect(serialized).not.toContain("source_gate");
    expect(serialized).not.toContain("source_export_support_day_30");
    expect(serialized).not.toContain("pipeline_dry_run_support_day_30");
    expect(serialized).not.toContain("workflow_support_case_resolution");
    expect(serialized).not.toContain("support_median_resolution_hours");
    expect(serialized).not.toContain("metric_definition_support_resolution");
    expect(serialized).not.toContain('"org_id"');
    expect(serialized).not.toContain('"client_id"');
    expect(serialized).not.toContain('"source_refs"');
    expect(serialized).not.toContain('"aggregate_boundary_ref"');
    expect(serialized).not.toContain('"customer_visible"');
    expect(serialized).not.toMatch(/"_?[a-z_]*hash"/i);
    expect(serialized).not.toMatch(/raw_rows|query_text|prompt|transcript|user_id/i);
  });

  it("uses approved customer display labels instead of deriving labels from compact IDs", async () => {
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        metric_id: "support_median_resolution_hours_internal_ref_do_not_show",
        workflow_family:
          "customer_support_case_resolution_internal_ref_do_not_show",
        metric_owner_approval_state: "approved_internal_ref_do_not_show",
        aggregate_export_review_state:
          "PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW_internal_ref_do_not_show",
        aggregate_source_export_ref:
          "bigquery_export_internal_source_export_ref_do_not_show",
        pipeline_dry_run_ref: "internal_pipeline_ref_do_not_show"
      })
    );

    const response = await request(app)
      .get("/api/v1/ai-value/customer-data-model/projections")
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.body.projections).toHaveLength(1);
    expect(response.body.projections[0]).toMatchObject({
      metric: {
        label: "Capacity metric",
        owner_review_state: "Metric owner review held"
      },
      workflow_context: {
        function_area: "Customer Support",
        workflow_label: "Customer Support workflow"
      },
      evidence_status: {
        aggregate_review_state: "Aggregate review held"
      }
    });

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain("support_median_resolution_hours");
    expect(serialized).not.toContain("customer_support_case_resolution");
    expect(serialized).not.toContain("internal_ref_do_not_show");
    expect(serialized).not.toContain("internal_source_export_ref_do_not_show");
    expect(serialized).not.toContain("internal_pipeline_ref_do_not_show");
  });

  it("sanitizes every customer-visible scalar before projecting compact snapshot rows", async () => {
    const hashLikeLabel = "a".repeat(64);
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        value_driver: "ROI confidence score",
        function_area: "BigQuery job 123",
        metric_unit: "warehouse table 123",
        metric_direction: "Sigma dashboard",
        metric_owner_approval_state: "Glean connector approved",
        aggregate_export_review_state: "project dataset export",
        metric_id: hashLikeLabel,
        workflow_family: "dashboard workbook export",
        aggregate_source_export_ref: "source_export_ref_hidden",
        pipeline_dry_run_ref: "pipeline_job_hidden"
      })
    );

    const response = await request(app)
      .get("/api/v1/ai-value/customer-data-model/projections")
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.body.projections).toHaveLength(1);
    expect(response.body.projections[0]).toMatchObject({
      value_driver: "Customer value",
      metric: {
        label: "Customer value metric",
        unit: "metric unit held",
        direction: "metric direction held",
        owner_review_state: "Metric owner review held"
      },
      workflow_context: {
        function_area: "Approved function",
        workflow_label: "Approved workflow context"
      },
      evidence_status: {
        aggregate_review_state: "Aggregate review held",
        validation_state: "clear"
      },
      next_action:
        "Customer-owned outcome review is required before any stronger claim is considered."
    });

    const projectedText = JSON.stringify({
      ...response.body.projections[0],
      blocked_outputs: []
    });
    expect(projectedText).not.toMatch(
      /BigQuery|Sigma|Glean|warehouse|connector|job|project|dataset|table|dashboard|workbook|export/i
    );
    expect(projectedText).not.toMatch(/ROI|confidence|probability|score|causal|productivity/i);
    expect(projectedText).not.toContain(hashLikeLabel);
    expect(projectedText).not.toContain("source_export_ref_hidden");
    expect(projectedText).not.toContain("pipeline_job_hidden");
  });

  it("holds the route state when compact snapshots exist but no row validates clear", async () => {
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        validation_valid: false,
        validation_gap_count: 1
      })
    );

    const response = await request(app)
      .get("/api/v1/ai-value/customer-data-model/projections")
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.body.projection_state).toBe(
      "HOLD_FOR_CUSTOMER_DATA_MODEL_SNAPSHOTS"
    );
    expect(response.body.projections).toEqual([]);
  });

  it("scopes projections to the authenticated org", async () => {
    seedCustomerSnapshot(customerDataModelSnapshot());
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        org_id: OTHER_ORG_ID,
        customer_data_model_snapshot_id:
          "customer_data_model_snapshot:org-other:measurement_cell_other_day_30",
        metric_id: "other_org_metric_internal_ref_do_not_show",
        value_driver: "Risk",
        function_area: "Legal"
      })
    );

    const orgResponse = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?measurement_plan_id=${measurementPlanId}`
      )
      .set(readAuth);
    const otherOrgResponse = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?measurement_plan_id=${measurementPlanId}`
      )
      .set(otherOrgReadAuth);

    expect(orgResponse.body.projections).toHaveLength(1);
    expect(orgResponse.body.projections[0].metric.label).toBe(
      "Capacity metric"
    );
    expect(otherOrgResponse.body.projections).toHaveLength(1);
    expect(otherOrgResponse.body.projections[0]).toMatchObject({
      metric: { label: "Risk metric" },
      workflow_context: {
        function_area: "Legal",
        workflow_label: "Legal workflow"
      }
    });
    expect(JSON.stringify(otherOrgResponse.body)).not.toContain(
      "other_org_metric_internal_ref_do_not_show"
    );
  });

  it("filters by measurement plan without exposing the selected plan id", async () => {
    seedCustomerSnapshot(customerDataModelSnapshot());
    seedCustomerSnapshot(
      customerDataModelSnapshot({
        measurement_plan_id: "measurement_plan_sales_2026_05",
        customer_data_model_snapshot_id:
          "customer_data_model_snapshot:org-northstar-enterprise:measurement_cell_sales_day_30",
        metric_id: "sales_cycle_days",
        function_area: "Sales"
      })
    );

    const response = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?measurement_plan_id=${measurementPlanId}`
      )
      .set(readAuth);

    expect(response.status).toBe(200);
    expect(response.body.filter_applied).toBe("measurement_plan");
    expect(response.body.measurement_plan_id).toBeUndefined();
    expect(response.body.projections).toHaveLength(1);
    expect(response.body.projections[0].workflow_context.function_area).toBe(
      "Customer Support"
    );
    expect(JSON.stringify(response.body)).not.toContain(measurementPlanId);
  });

  it("rejects connector-shaped or tenant-shaped query parameters", async () => {
    const connectorSideDoor = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?measurement_plan_id=${measurementPlanId}&bigquery_job_id=job_123`
      )
      .set(readAuth);
    const repeatedMeasurementPlan = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?measurement_plan_id=${measurementPlanId}&measurement_plan_id=second`
      )
      .set(readAuth);
    const tenantSideDoor = await request(app)
      .get(
        `/api/v1/ai-value/customer-data-model/projections?org_id=${OTHER_ORG_ID}`
      )
      .set(readAuth);

    expect(connectorSideDoor.status).toBe(400);
    expect(connectorSideDoor.headers["cache-control"]).toContain("no-store");
    expect(connectorSideDoor.headers["x-ai-value-live-connectors"]).toBe("false");
    expect(connectorSideDoor.headers["x-ai-value-export-authorized"]).toBe("false");
    expect(connectorSideDoor.headers["x-ai-value-customer-facing-economic-output"]).toBe(
      "false"
    );
    expect(connectorSideDoor.body.reason).toBe(
      "INVALID_CUSTOMER_DATA_MODEL_PROJECTION_QUERY"
    );
    expect(JSON.stringify(connectorSideDoor.body)).not.toContain("job_123");
    expect(repeatedMeasurementPlan.status).toBe(400);
    expect(repeatedMeasurementPlan.headers["cache-control"]).toContain("no-store");
    expect(repeatedMeasurementPlan.headers["x-ai-value-live-connectors"]).toBe(
      "false"
    );
    expect(repeatedMeasurementPlan.body.reason).toBe(
      "INVALID_CUSTOMER_DATA_MODEL_PROJECTION_QUERY"
    );
    expect(tenantSideDoor.status).toBe(403);
    expect(tenantSideDoor.headers["cache-control"]).toContain("no-store");
    expect(tenantSideDoor.headers["x-ai-value-customer-projection-boundary"]).toBe(
      "source_bound_customer_data_model_projection"
    );
    expect(tenantSideDoor.headers["x-ai-value-live-connectors"]).toBe("false");
    expect(tenantSideDoor.headers["x-ai-value-export-authorized"]).toBe("false");
    expect(tenantSideDoor.headers["x-ai-value-customer-facing-economic-output"]).toBe(
      "false"
    );
  });

  it("does not open the internal Measurement Cell snapshot route", async () => {
    const response = await request(app)
      .get("/api/v1/ai-value/measurement-cell-snapshots")
      .set(readAuth);

    expect(response.status).toBe(404);
  });
});
