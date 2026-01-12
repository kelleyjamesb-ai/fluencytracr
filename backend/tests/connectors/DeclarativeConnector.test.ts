import { DeclarativeConnector } from "../../src/connectors/base/DeclarativeConnector";
import { ConnectorMapping, ExternalEvent } from "../../src/connectors/base/ConnectorBase";

describe("DeclarativeConnector", () => {
  const chatToolMapping: ConnectorMapping = {
    connector_metadata: {
      connector_name: "test-chat-tool",
      connector_version: "1.0.0",
      vendor: "test-vendor",
      tool_class: "llm_chat"
    },
    signal_mappings: [
      {
        external_event_type: "chat.session.started",
        internal_signal_name: "invoke_ai",
        requires_side_effect: false,
        validation_rules: [
          {
            rule_type: "field_exists",
            field_path: "session_id"
          }
        ],
        metadata_extraction: {
          has_human_review: "session.human_review_enabled"
        }
      },
      {
        external_event_type: "chat.action.executed",
        internal_signal_name: "delegate_to_agent",
        requires_side_effect: true,
        validation_rules: [
          {
            rule_type: "field_equals",
            field_path: "action.type",
            expected_value: "execute_external"
          },
          {
            rule_type: "field_exists",
            field_path: "action.side_effect_occurred"
          }
        ],
        metadata_extraction: {
          external_side_effect: "action.side_effect_occurred"
        }
      }
    ],
    forbidden_fields: [
      {
        field_name: "prompt_content",
        reason: "Privacy: Never collect prompt text"
      },
      {
        field_name: "output_content",
        reason: "Privacy: Never collect output text"
      }
    ]
  };

  describe("Successful transformations", () => {
    it("should transform valid invoke_ai event", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          session: {
            human_review_enabled: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals?.[0].signal_name).toBe("invoke_ai");
      expect(result.signals?.[0].tool_class).toBe("llm_chat");
      expect(result.signals?.[0].metadata.has_human_review).toBe(true);
      expect(result.signals?.[0].count).toBe(1);
    });

    it("should transform valid delegate_to_agent event with side effect", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.executed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            type: "execute_external",
            side_effect_occurred: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals?.[0].signal_name).toBe("delegate_to_agent");
      expect(result.signals?.[0].metadata.external_side_effect).toBe(true);
    });
  });

  describe("Forbidden fields enforcement", () => {
    it("should reject events containing prompt_content", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          prompt_content: "This should be blocked"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("contains forbidden fields")
      );
    });

    it("should reject events containing nested forbidden fields", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          session: {
            output_content: "This should be blocked"
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("contains forbidden fields")
      );
    });
  });

  describe("Agentic boundary enforcement", () => {
    it("should reject delegate_to_agent without external side effect", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.executed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            type: "execute_external",
            side_effect_occurred: false
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("requires external_side_effect=true")
      );
    });

    it("should skip delegate_to_agent without side effect field", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.executed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            type: "execute_external"
          }
        }
      ];

      const result = connector.transform(events);

      // When validation fails (missing required field), event is silently skipped
      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(0);
    });
  });

  describe("Validation rules", () => {
    it("should fail validation when required field is missing", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z"
          // Missing session_id
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true); // No errors, just no signals
      expect(result.signals).toHaveLength(0);
    });

    it("should fail validation when field_equals doesn't match", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.executed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            type: "execute_internal", // Wrong value
            side_effect_occurred: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(0);
    });
  });

  describe("Unknown event types", () => {
    it("should report error for unmapped event types", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "unknown.event.type",
          timestamp: "2026-01-12T10:00:00Z"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("No mapping found")
      );
    });
  });

  describe("Metadata extraction", () => {
    it("should extract metadata from nested fields", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          session: {
            human_review_enabled: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals?.[0].metadata.has_human_review).toBe(true);
    });

    it("should handle missing optional metadata fields", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123"
          // No session.human_review_enabled
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals?.[0].metadata.has_human_review).toBe(false);
    });
  });

  describe("Batch processing", () => {
    it("should transform multiple valid events", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-1"
        },
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:01:00Z",
          session_id: "session-2"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(2);
    });

    it("should continue processing after encountering invalid events", () => {
      const connector = new DeclarativeConnector(chatToolMapping);
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-1"
        },
        {
          event_type: "unknown.event",
          timestamp: "2026-01-12T10:01:00Z"
        },
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:02:00Z",
          session_id: "session-2"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false); // Has errors
      expect(result.signals).toHaveLength(2); // But processed valid events
      expect(result.errors).toHaveLength(1);
    });
  });
});
