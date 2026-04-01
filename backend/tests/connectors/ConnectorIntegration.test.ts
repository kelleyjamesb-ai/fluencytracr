import * as path from "path";
import { MappingLoader } from "../../src/connectors/base/MappingLoader";
import { ExternalEvent } from "../../src/connectors/base/ConnectorBase";

describe("Connector Integration Tests", () => {
  const mappingsDir = path.join(__dirname, "../../src/connectors/mappings");

  describe("Chat Tool Connector", () => {
    let connector: any;

    beforeAll(() => {
      const mappingPath = path.join(mappingsDir, "chat-tool-connector.json");
      connector = MappingLoader.loadFromJSON(mappingPath);
    });

    it("should transform chat.session.started to invoke_ai", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          user_id: "user-456"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("invoke_ai");
      expect(result.signals[0].tool_class).toBe("llm_chat");
    });

    it("should transform chat.action.executed to delegate_to_agent with side effect", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.executed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            type: "execute_external",
            side_effect_occurred: true,
            is_cross_system: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("delegate_to_agent");
      expect(result.signals[0].metadata.external_side_effect).toBe(true);
      expect(result.signals[0].metadata.is_cross_system).toBe(true);
    });

    it("should reject delegate_to_agent without side effect", () => {
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

    it("should transform chat.action.cancelled to revoke_agent", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.action.cancelled",
          timestamp: "2026-01-12T10:00:00Z",
          action_id: "action-123",
          cancelled_by: "user"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("revoke_agent");
    });

    it("should transform chat.prompt.edited to refine_request", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.prompt.edited",
          timestamp: "2026-01-12T10:00:00Z",
          edit_count: 3
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("refine_request");
    });

    it("should transform chat.output.accepted to accept_output", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.output.accepted",
          timestamp: "2026-01-12T10:00:00Z",
          acceptance: {
            status: "accepted",
            human_reviewed: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("accept_output");
      expect(result.signals[0].metadata.has_human_review).toBe(true);
    });

    it("should transform chat.retry.initiated to retry_after_mismatch", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.retry.initiated",
          timestamp: "2026-01-12T10:00:00Z",
          retry_reason: "mismatch between expected and actual output"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("retry_after_mismatch");
    });

    it("should transform chat.manual.override to override_to_manual", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.manual.override",
          timestamp: "2026-01-12T10:00:00Z",
          override: {
            type: "manual"
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("override_to_manual");
    });

    it("should reject events with forbidden fields", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "chat.session.started",
          timestamp: "2026-01-12T10:00:00Z",
          session_id: "session-123",
          user_id: "user-456",
          prompt_content: "This should be rejected"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining("contains forbidden fields")
      );
    });
  });

  describe("Workflow Agent Connector", () => {
    let connector: any;

    beforeAll(() => {
      const mappingPath = path.join(mappingsDir, "workflow-agent-connector.json");
      connector = MappingLoader.loadFromJSON(mappingPath);
    });

    it("should transform workflow.agent.invoked to invoke_ai", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.agent.invoked",
          timestamp: "2026-01-12T10:00:00Z",
          workflow_id: "workflow-123",
          agent_type: "automation-agent"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("invoke_ai");
      expect(result.signals[0].tool_class).toBe("workflow_automation");
    });

    it("should transform workflow.action.completed to delegate_to_agent with side effect", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.action.completed",
          timestamp: "2026-01-12T10:00:00Z",
          action: {
            status: "completed",
            external_effect: true,
            is_cross_system: true,
            required_approval: false
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("delegate_to_agent");
      expect(result.signals[0].metadata.external_side_effect).toBe(true);
      expect(result.signals[0].metadata.is_cross_system).toBe(true);
      expect(result.signals[0].metadata.requires_approval).toBe(false);
    });

    it("should transform workflow.agent.stopped to revoke_agent", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.agent.stopped",
          timestamp: "2026-01-12T10:00:00Z",
          stop_reason: "user_cancelled"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("revoke_agent");
    });

    it("should transform workflow.parameters.updated to refine_request", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.parameters.updated",
          timestamp: "2026-01-12T10:00:00Z",
          parameter_changes: { param1: "value1" },
          updated_by: "user"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("refine_request");
    });

    it("should transform workflow.result.approved to accept_output", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.result.approved",
          timestamp: "2026-01-12T10:00:00Z",
          approval: {
            status: "approved",
            human_reviewed: true,
            required: true
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("accept_output");
      expect(result.signals[0].metadata.has_human_review).toBe(true);
      expect(result.signals[0].metadata.requires_approval).toBe(true);
    });

    it("should transform workflow.retry.triggered to retry_after_mismatch", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.retry.triggered",
          timestamp: "2026-01-12T10:00:00Z",
          retry_trigger: "error in workflow execution"
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("retry_after_mismatch");
    });

    it("should transform workflow.manual.takeover to override_to_manual", () => {
      const events: ExternalEvent[] = [
        {
          event_type: "workflow.manual.takeover",
          timestamp: "2026-01-12T10:00:00Z",
          takeover: {
            type: "manual_intervention"
          }
        }
      ];

      const result = connector.transform(events);

      expect(result.success).toBe(true);
      expect(result.signals).toHaveLength(1);
      expect(result.signals[0].signal_name).toBe("override_to_manual");
    });
  });

  describe("Cross-connector validation", () => {
    it("should enforce forbidden fields across all connectors", () => {
      const chatConnector = MappingLoader.loadFromJSON(
        path.join(mappingsDir, "chat-tool-connector.json")
      );
      const workflowConnector = MappingLoader.loadFromJSON(
        path.join(mappingsDir, "workflow-agent-connector.json")
      );

      const forbiddenEvent: ExternalEvent = {
        event_type: "chat.session.started",
        timestamp: "2026-01-12T10:00:00Z",
        session_id: "session-123",
        user_id: "user-456",
        output_content: "This should be blocked"
      };

      const chatResult = chatConnector.transform([forbiddenEvent]);
      expect(chatResult.success).toBe(false);

      const workflowEvent: ExternalEvent = {
        event_type: "workflow.agent.invoked",
        timestamp: "2026-01-12T10:00:00Z",
        workflow_id: "workflow-123",
        agent_type: "agent",
        keystrokes: "This should be blocked"
      };

      const workflowResult = workflowConnector.transform([workflowEvent]);
      expect(workflowResult.success).toBe(false);
    });

    it("should enforce agentic boundary across all connectors", () => {
      const chatConnector = MappingLoader.loadFromJSON(
        path.join(mappingsDir, "chat-tool-connector.json")
      );
      const workflowConnector = MappingLoader.loadFromJSON(
        path.join(mappingsDir, "workflow-agent-connector.json")
      );

      const chatEvent: ExternalEvent = {
        event_type: "chat.action.executed",
        timestamp: "2026-01-12T10:00:00Z",
        action: {
          type: "execute_external",
          side_effect_occurred: false
        }
      };

      const chatResult = chatConnector.transform([chatEvent]);
      expect(chatResult.success).toBe(false);

      const workflowEvent: ExternalEvent = {
        event_type: "workflow.action.completed",
        timestamp: "2026-01-12T10:00:00Z",
        action: {
          status: "completed",
          external_effect: false
        }
      };

      const workflowResult = workflowConnector.transform([workflowEvent]);
      expect(workflowResult.success).toBe(false);
    });
  });
});
