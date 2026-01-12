import { ConnectorRegistry } from "../../src/connectors/base/ConnectorRegistry";
import { DeclarativeConnector } from "../../src/connectors/base/DeclarativeConnector";
import { ConnectorMapping } from "../../src/connectors/base/ConnectorBase";

describe("ConnectorRegistry", () => {
  let registry: ConnectorRegistry;

  const createTestMapping = (name: string, vendor: string): ConnectorMapping => ({
    connector_metadata: {
      connector_name: name,
      connector_version: "1.0.0",
      vendor: vendor,
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
  });

  beforeEach(() => {
    registry = ConnectorRegistry.getInstance();
    registry.clear();
  });

  describe("Singleton pattern", () => {
    it("should return the same instance", () => {
      const instance1 = ConnectorRegistry.getInstance();
      const instance2 = ConnectorRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("register", () => {
    it("should register a connector", () => {
      const mapping = createTestMapping("test-connector", "test-vendor");
      const connector = new DeclarativeConnector(mapping);

      registry.register(connector);

      expect(registry.size()).toBe(1);
    });

    it("should register multiple connectors with different vendors", () => {
      const connector1 = new DeclarativeConnector(createTestMapping("connector-1", "vendor-1"));
      const connector2 = new DeclarativeConnector(createTestMapping("connector-2", "vendor-2"));

      registry.register(connector1);
      registry.register(connector2);

      expect(registry.size()).toBe(2);
    });

    it("should overwrite connector with same vendor and name", () => {
      const mapping1 = createTestMapping("test-connector", "test-vendor");
      const connector1 = new DeclarativeConnector(mapping1);

      const mapping2 = { ...mapping1, connector_metadata: { ...mapping1.connector_metadata, connector_version: "2.0.0" } };
      const connector2 = new DeclarativeConnector(mapping2);

      registry.register(connector1);
      registry.register(connector2);

      expect(registry.size()).toBe(1);
      const retrieved = registry.getConnector("test-vendor", "test-connector");
      expect(retrieved?.getConnectorVersion()).toBe("2.0.0");
    });
  });

  describe("getConnector", () => {
    it("should retrieve registered connector by vendor and name", () => {
      const mapping = createTestMapping("test-connector", "test-vendor");
      const connector = new DeclarativeConnector(mapping);
      registry.register(connector);

      const retrieved = registry.getConnector("test-vendor", "test-connector");

      expect(retrieved).toBeDefined();
      expect(retrieved?.getConnectorName()).toBe("test-connector");
      expect(retrieved?.getVendor()).toBe("test-vendor");
    });

    it("should return undefined for unregistered connector", () => {
      const retrieved = registry.getConnector("unknown-vendor", "unknown-connector");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("getAllConnectors", () => {
    it("should return all registered connectors", () => {
      const connector1 = new DeclarativeConnector(createTestMapping("connector-1", "vendor-1"));
      const connector2 = new DeclarativeConnector(createTestMapping("connector-2", "vendor-2"));
      const connector3 = new DeclarativeConnector(createTestMapping("connector-3", "vendor-3"));

      registry.register(connector1);
      registry.register(connector2);
      registry.register(connector3);

      const allConnectors = registry.getAllConnectors();

      expect(allConnectors).toHaveLength(3);
    });

    it("should return empty array when no connectors registered", () => {
      const allConnectors = registry.getAllConnectors();

      expect(allConnectors).toHaveLength(0);
    });
  });

  describe("getConnectorsByVendor", () => {
    it("should return all connectors for specific vendor", () => {
      const connector1 = new DeclarativeConnector(createTestMapping("connector-1", "vendor-a"));
      const connector2 = new DeclarativeConnector(createTestMapping("connector-2", "vendor-a"));
      const connector3 = new DeclarativeConnector(createTestMapping("connector-3", "vendor-b"));

      registry.register(connector1);
      registry.register(connector2);
      registry.register(connector3);

      const vendorAConnectors = registry.getConnectorsByVendor("vendor-a");

      expect(vendorAConnectors).toHaveLength(2);
      expect(vendorAConnectors.every((c) => c.getVendor() === "vendor-a")).toBe(true);
    });

    it("should return empty array for vendor with no connectors", () => {
      const connector1 = new DeclarativeConnector(createTestMapping("connector-1", "vendor-a"));
      registry.register(connector1);

      const vendorBConnectors = registry.getConnectorsByVendor("vendor-b");

      expect(vendorBConnectors).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("should remove all registered connectors", () => {
      const connector1 = new DeclarativeConnector(createTestMapping("connector-1", "vendor-1"));
      const connector2 = new DeclarativeConnector(createTestMapping("connector-2", "vendor-2"));

      registry.register(connector1);
      registry.register(connector2);
      expect(registry.size()).toBe(2);

      registry.clear();

      expect(registry.size()).toBe(0);
    });
  });

  describe("size", () => {
    it("should return correct count of registered connectors", () => {
      expect(registry.size()).toBe(0);

      registry.register(new DeclarativeConnector(createTestMapping("connector-1", "vendor-1")));
      expect(registry.size()).toBe(1);

      registry.register(new DeclarativeConnector(createTestMapping("connector-2", "vendor-2")));
      expect(registry.size()).toBe(2);

      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});
