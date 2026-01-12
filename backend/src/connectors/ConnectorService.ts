import { ConnectorRegistry } from "./base/ConnectorRegistry";
import { ExternalEvent, InternalSignal } from "./base/ConnectorBase";
import { BehavioralSignalAggregate } from "@learnaire/shared";

export interface ConnectorEventImport {
  vendor: string;
  connector_name: string;
  org_id: string;
  group_id: string;
  group_type: "team" | "role" | "function" | "org";
  function_id?: string;
  bucket_start: string;
  events: ExternalEvent[];
}

export interface ConnectorTransformResult {
  success: boolean;
  aggregates?: BehavioralSignalAggregate[];
  errors?: string[];
}

export class ConnectorService {
  private registry: ConnectorRegistry;

  constructor() {
    this.registry = ConnectorRegistry.getInstance();
  }

  transformEvents(importData: ConnectorEventImport): ConnectorTransformResult {
    const connector = this.registry.getConnector(importData.vendor, importData.connector_name);

    if (!connector) {
      return {
        success: false,
        errors: [`Connector not found: ${importData.vendor}:${importData.connector_name}`]
      };
    }

    const transformResult = connector.transform(importData.events);

    if (!transformResult.success || !transformResult.signals) {
      return {
        success: false,
        errors: transformResult.errors || ["Unknown transformation error"]
      };
    }

    // Aggregate signals by signal_name
    const signalCounts = new Map<string, { signal: InternalSignal; count: number }>();

    for (const signal of transformResult.signals) {
      const key = signal.signal_name;
      const existing = signalCounts.get(key);

      if (existing) {
        existing.count += signal.count;
      } else {
        signalCounts.set(key, { signal, count: signal.count });
      }
    }

    // Convert to BehavioralSignalAggregate format
    const aggregates: BehavioralSignalAggregate[] = [];

    for (const { signal, count } of signalCounts.values()) {
      aggregates.push({
        org_id: importData.org_id,
        group_id: importData.group_id,
        group_type: importData.group_type,
        function_id: importData.function_id,
        bucket_start: importData.bucket_start,
        signal_name: signal.signal_name as any, // v0 signal names
        count: count,
        tool_class: signal.tool_class as any,
        metadata: signal.metadata
      });
    }

    return {
      success: true,
      aggregates
    };
  }

  loadConnectors(mappingsDirectory: string): void {
    this.registry.loadFromDirectory(mappingsDirectory);
  }

  getLoadedConnectors(): Array<{ vendor: string; name: string; toolClass: string }> {
    return this.registry.getAllConnectors().map((c) => ({
      vendor: c.getVendor(),
      name: c.getConnectorName(),
      toolClass: c.getToolClass()
    }));
  }
}
