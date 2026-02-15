"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATTERN_TYPES = exports.GROUP_TYPES = exports.V0_SIGNAL_NAMES = exports.SIGNAL_NAMES = exports.FORBIDDEN_CAPABILITIES = exports.ALLOWED_CAPABILITIES = exports.TOOL_CLASSES = void 0;
exports.TOOL_CLASSES = [
    "llm_chat",
    "research",
    "coding",
    "workflow_automation",
    "embedded_ai"
];
exports.ALLOWED_CAPABILITIES = [
    "VIEW_ORG_AGGREGATES",
    "VIEW_TEAM_AGGREGATES",
    "MANAGE_ORG_CONFIG",
    "INGEST_DATA"
];
exports.FORBIDDEN_CAPABILITIES = [
    "VIEW_INDIVIDUAL_ACTIVITY",
    "VIEW_RAW_EVENTS"
];
exports.SIGNAL_NAMES = [
    "delegate_send_message",
    "delegate_file_update",
    "delegate_record_create",
    "delegate_record_update",
    "delegate_approval_request",
    "delegate_data_fetch",
    "delegate_code_commit",
    "delegate_schedule_event",
    "delegate_task_assign",
    "delegate_payment_initiate"
];
// v0 Agentic Behavioral Signals - Universal signal set for connector layer
exports.V0_SIGNAL_NAMES = [
    "invoke_ai",
    "delegate_to_agent",
    "revoke_agent",
    "refine_request",
    "accept_output",
    "retry_after_mismatch",
    "override_to_manual"
];
exports.GROUP_TYPES = ["team", "role", "function", "org"];
exports.PATTERN_TYPES = [
    "automation_emerging",
    "approval_workflow_mature",
    "cross_system_integration",
    "human_review_dominant",
    "data_intensive"
];
