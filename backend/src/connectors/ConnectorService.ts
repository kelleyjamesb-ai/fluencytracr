import { ConnectorRegistry } from "./base/ConnectorRegistry";
import { ExternalEvent, InternalSignal } from "./base/ConnectorBase";
import { DeclarativeConnector } from "./base/DeclarativeConnector";
import { ConnectorSignalAggregate, AnySignalNameSchema, ToolClassSchema } from "@fluencytracr/shared";

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
  aggregates?: ConnectorSignalAggregate[];
  errors?: string[];
}

export interface ConnectorUnknownEventResult {
  unknown_event_types: string[];
  unknown_event_count: number;
  sample_events: Array<{ event_type: string; timestamp: string }>;
}

export interface ConnectorInvalidEventResult {
  invalid_event_types: string[];
  invalid_event_count: number;
  sample_events: Array<{ event_type: string; timestamp: string; reason: string }>;
}

export class ConnectorService {
  private registry: ConnectorRegistry;

  constructor() {
    this.registry = ConnectorRegistry.getInstance();
  }

  findUnknownEvents(importData: ConnectorEventImport): ConnectorUnknownEventResult {
    const connector = this.registry.getConnector(importData.vendor, importData.connector_name);
    if (!connector) {
      return { unknown_event_types: [], unknown_event_count: 0, sample_events: [] };
    }

    const knownEventTypes = new Set(connector.getMappedEventTypes());
    const unknownEvents = importData.events.filter((event) => !knownEventTypes.has(event.event_type));
    const unknownEventTypes = Array.from(new Set(unknownEvents.map((event) => event.event_type)));

    const sampleEvents = unknownEvents.slice(0, 5).map((event) => ({
      event_type: event.event_type,
      timestamp: event.timestamp
    }));

    return {
      unknown_event_types: unknownEventTypes,
      unknown_event_count: unknownEvents.length,
      sample_events: sampleEvents
    };
  }

  findInvalidMappedEvents(importData: ConnectorEventImport): ConnectorInvalidEventResult {
    const connector = this.registry.getConnector(importData.vendor, importData.connector_name);
    if (!connector || !(connector instanceof DeclarativeConnector)) {
      return { invalid_event_types: [], invalid_event_count: 0, sample_events: [] };
    }

    const invalidEvents = connector.getInvalidMappedEvents(importData.events);
    const invalidEventTypes = Array.from(new Set(invalidEvents.map((event) => event.event_type)));
    return {
      invalid_event_types: invalidEventTypes,
      invalid_event_count: invalidEvents.length,
      sample_events: invalidEvents.slice(0, 5)
    };
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

    // Convert to ConnectorSignalAggregate format with proper validation
    const aggregates: ConnectorSignalAggregate[] = [];
    const validationErrors: string[] = [];

    for (const { signal, count } of signalCounts.values()) {
      // Validate signal_name against allowed values (both legacy and v0)
      const signalNameResult = AnySignalNameSchema.safeParse(signal.signal_name);
      if (!signalNameResult.success) {
        validationErrors.push(`Invalid signal_name "${signal.signal_name}": must be a valid signal name`);
        continue;
      }

      // Validate tool_class if provided
      let validatedToolClass: typeof ToolClassSchema._type | undefined;
      if (signal.tool_class) {
        const toolClassResult = ToolClassSchema.safeParse(signal.tool_class);
        if (!toolClassResult.success) {
          validationErrors.push(`Invalid tool_class "${signal.tool_class}": must be one of llm_chat, research, coding, workflow_automation, embedded_ai`);
          continue;
        }
        validatedToolClass = toolClassResult.data;
      }

      aggregates.push({
        org_id: importData.org_id,
        group_id: importData.group_id,
        group_type: importData.group_type,
        function_id: importData.function_id,
        bucket_start: importData.bucket_start,
        signal_name: signalNameResult.data,
        count: count,
        tool_class: validatedToolClass,
        metadata: signal.metadata
      });
    }

    // Return success even with some validation errors if we have valid aggregates
    // Include validation errors for logging/debugging
    return {
      success: aggregates.length > 0 || validationErrors.length === 0,
      aggregates,
      errors: validationErrors.length > 0 ? validationErrors : undefined
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
