import { DeclarativeConnector } from "./DeclarativeConnector";
import { MappingLoader } from "./MappingLoader";

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<string, DeclarativeConnector>;

  private constructor() {
    this.connectors = new Map();
  }

  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  register(connector: DeclarativeConnector): void {
    const key = `${connector.getVendor()}:${connector.getConnectorName()}`;
    this.connectors.set(key, connector);
  }

  getConnector(vendor: string, connectorName: string): DeclarativeConnector | undefined {
    const key = `${vendor}:${connectorName}`;
    return this.connectors.get(key);
  }

  getAllConnectors(): DeclarativeConnector[] {
    return Array.from(this.connectors.values());
  }

  getConnectorsByVendor(vendor: string): DeclarativeConnector[] {
    return Array.from(this.connectors.values()).filter((c) => c.getVendor() === vendor);
  }

  loadFromDirectory(directoryPath: string): void {
    const connectors = MappingLoader.loadFromDirectory(directoryPath);
    for (const connector of connectors) {
      this.register(connector);
    }
  }

  clear(): void {
    this.connectors.clear();
  }

  size(): number {
    return this.connectors.size;
  }
}
