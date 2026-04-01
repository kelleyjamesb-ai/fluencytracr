import * as fs from "fs";
import * as path from "path";
import { MappingLoader } from "../../src/connectors/base/MappingLoader";

describe("MappingLoader", () => {
  const testMappingsDir = path.join(__dirname, "test-mappings");

  beforeEach(() => {
    // Clean and recreate test directory before each test
    if (fs.existsSync(testMappingsDir)) {
      fs.rmSync(testMappingsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testMappingsDir, { recursive: true });
  });

  afterAll(() => {
    // Final cleanup
    if (fs.existsSync(testMappingsDir)) {
      fs.rmSync(testMappingsDir, { recursive: true, force: true });
    }
  });

  describe("loadFromJSON", () => {
    it("should load valid connector mapping from JSON", () => {
      const validMapping = {
        connector_metadata: {
          connector_name: "test-connector",
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        signal_mappings: [
          {
            external_event_type: "test.event",
            internal_signal_name: "invoke_ai",
            requires_side_effect: false,
            validation_rules: [
              {
                rule_type: "field_exists",
                field_path: "event_id"
              }
            ]
          }
        ],
        forbidden_fields: [
          {
            field_name: "prompt_content",
            reason: "Privacy"
          }
        ]
      };

      const filePath = path.join(testMappingsDir, "valid-connector.json");
      fs.writeFileSync(filePath, JSON.stringify(validMapping, null, 2));

      const connector = MappingLoader.loadFromJSON(filePath);

      expect(connector).toBeDefined();
      expect(connector.getConnectorName()).toBe("test-connector");
      expect(connector.getVendor()).toBe("test-vendor");
      expect(connector.getToolClass()).toBe("llm_chat");
    });

    it("should reject mapping without connector_name", () => {
      const invalidMapping = {
        connector_metadata: {
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        signal_mappings: [],
        forbidden_fields: []
      };

      const filePath = path.join(testMappingsDir, "invalid-no-name.json");
      fs.writeFileSync(filePath, JSON.stringify(invalidMapping, null, 2));

      expect(() => {
        MappingLoader.loadFromJSON(filePath);
      }).toThrow("Invalid connector mapping");
    });

    it("should reject mapping without signal_mappings", () => {
      const invalidMapping = {
        connector_metadata: {
          connector_name: "test-connector",
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        forbidden_fields: []
      };

      const filePath = path.join(testMappingsDir, "invalid-no-mappings.json");
      fs.writeFileSync(filePath, JSON.stringify(invalidMapping, null, 2));

      expect(() => {
        MappingLoader.loadFromJSON(filePath);
      }).toThrow("Invalid connector mapping");
    });

    it("should reject mapping with empty signal_mappings array", () => {
      const invalidMapping = {
        connector_metadata: {
          connector_name: "test-connector",
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        signal_mappings: [],
        forbidden_fields: []
      };

      const filePath = path.join(testMappingsDir, "invalid-empty-mappings.json");
      fs.writeFileSync(filePath, JSON.stringify(invalidMapping, null, 2));

      expect(() => {
        MappingLoader.loadFromJSON(filePath);
      }).toThrow();
    });

    it("should reject mapping with invalid validation rule type", () => {
      const invalidMapping = {
        connector_metadata: {
          connector_name: "test-connector",
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        signal_mappings: [
          {
            external_event_type: "test.event",
            internal_signal_name: "invoke_ai",
            requires_side_effect: false,
            validation_rules: [
              {
                rule_type: "invalid_rule_type",
                field_path: "event_id"
              }
            ]
          }
        ],
        forbidden_fields: []
      };

      const filePath = path.join(testMappingsDir, "invalid-rule-type.json");
      fs.writeFileSync(filePath, JSON.stringify(invalidMapping, null, 2));

      expect(() => {
        MappingLoader.loadFromJSON(filePath);
      }).toThrow("Invalid connector mapping");
    });
  });

  describe("loadFromDirectory", () => {
    it("should load multiple connectors from directory", () => {
      const connector1 = {
        connector_metadata: {
          connector_name: "connector-1",
          connector_version: "1.0.0",
          vendor: "vendor-1",
          tool_class: "llm_chat"
        },
        signal_mappings: [
          {
            external_event_type: "event.1",
            internal_signal_name: "invoke_ai",
            requires_side_effect: false,
            validation_rules: []
          }
        ],
        forbidden_fields: []
      };

      const connector2 = {
        connector_metadata: {
          connector_name: "connector-2",
          connector_version: "1.0.0",
          vendor: "vendor-2",
          tool_class: "coding"
        },
        signal_mappings: [
          {
            external_event_type: "event.2",
            internal_signal_name: "delegate_to_agent",
            requires_side_effect: true,
            validation_rules: []
          }
        ],
        forbidden_fields: []
      };

      fs.writeFileSync(
        path.join(testMappingsDir, "connector-1.json"),
        JSON.stringify(connector1, null, 2)
      );
      fs.writeFileSync(
        path.join(testMappingsDir, "connector-2.json"),
        JSON.stringify(connector2, null, 2)
      );

      const connectors = MappingLoader.loadFromDirectory(testMappingsDir);

      expect(connectors).toHaveLength(2);
      expect(connectors.map((c) => c.getConnectorName())).toContain("connector-1");
      expect(connectors.map((c) => c.getConnectorName())).toContain("connector-2");
    });

    it("should skip invalid connector files and continue loading", () => {
      const validConnector = {
        connector_metadata: {
          connector_name: "valid-connector",
          connector_version: "1.0.0",
          vendor: "vendor-1",
          tool_class: "llm_chat"
        },
        signal_mappings: [
          {
            external_event_type: "event.1",
            internal_signal_name: "invoke_ai",
            requires_side_effect: false,
            validation_rules: []
          }
        ],
        forbidden_fields: []
      };

      const invalidConnector = {
        connector_metadata: {
          connector_version: "1.0.0"
        }
      };

      fs.writeFileSync(
        path.join(testMappingsDir, "valid.json"),
        JSON.stringify(validConnector, null, 2)
      );
      fs.writeFileSync(
        path.join(testMappingsDir, "invalid.json"),
        JSON.stringify(invalidConnector, null, 2)
      );

      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const connectors = MappingLoader.loadFromDirectory(testMappingsDir);
      errorSpy.mockRestore();

      expect(connectors).toHaveLength(1);
      expect(connectors[0].getConnectorName()).toBe("valid-connector");
    });

    it("should return empty array for directory with no JSON files", () => {
      const emptyDir = path.join(testMappingsDir, "empty");
      fs.mkdirSync(emptyDir, { recursive: true });

      const connectors = MappingLoader.loadFromDirectory(emptyDir);

      expect(connectors).toHaveLength(0);
    });
  });

  describe("validateMapping", () => {
    it("should validate correct mapping", () => {
      const validMapping = {
        connector_metadata: {
          connector_name: "test-connector",
          connector_version: "1.0.0",
          vendor: "test-vendor",
          tool_class: "llm_chat"
        },
        signal_mappings: [
          {
            external_event_type: "test.event",
            internal_signal_name: "invoke_ai",
            requires_side_effect: false,
            validation_rules: []
          }
        ],
        forbidden_fields: []
      };

      const result = MappingLoader.validateMapping(validMapping);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it("should return errors for invalid mapping", () => {
      const invalidMapping = {
        connector_metadata: {
          connector_name: "test-connector"
        },
        signal_mappings: []
      };

      const result = MappingLoader.validateMapping(invalidMapping);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
