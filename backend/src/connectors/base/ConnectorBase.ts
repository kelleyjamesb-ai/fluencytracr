import { z } from "zod";

export interface ExternalEvent {
  event_type: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface InternalSignal {
  signal_name: string;
  tool_class: string;
  metadata: {
    has_human_review?: boolean;
    is_cross_system?: boolean;
    requires_approval?: boolean;
    external_side_effect?: boolean;
  };
  count: number;
}

export interface TransformResult {
  success: boolean;
  signals?: InternalSignal[];
  errors?: string[];
}

export interface ValidationRule {
  rule_type: "field_exists" | "field_equals" | "field_matches" | "value_in_range";
  field_path: string;
  expected_value?: unknown;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface SignalMapping {
  external_event_type: string;
  internal_signal_name: string;
  requires_side_effect: boolean;
  validation_rules: ValidationRule[];
  metadata_extraction?: {
    has_human_review?: string;
    is_cross_system?: string;
    requires_approval?: string;
    external_side_effect?: string;
  };
}

export interface ConnectorMapping {
  connector_metadata: {
    connector_name: string;
    connector_version: string;
    vendor: string;
    tool_class: string;
  };
  signal_mappings: SignalMapping[];
  forbidden_fields: Array<{
    field_name: string;
    reason: string;
  }>;
}

export abstract class ConnectorBase {
  protected mapping: ConnectorMapping;

  constructor(mapping: ConnectorMapping) {
    this.mapping = mapping;
    this.validateMapping();
  }

  abstract transform(events: ExternalEvent[]): TransformResult;

  protected validateMapping(): void {
    if (!this.mapping.connector_metadata.connector_name) {
      throw new Error("Connector name is required");
    }
    if (!this.mapping.connector_metadata.vendor) {
      throw new Error("Vendor is required");
    }
    if (!this.mapping.signal_mappings || this.mapping.signal_mappings.length === 0) {
      throw new Error("At least one signal mapping is required");
    }
  }

  protected validateEvent(event: ExternalEvent, mapping: SignalMapping): boolean {
    for (const rule of mapping.validation_rules) {
      const value = this.getNestedValue(event, rule.field_path);

      switch (rule.rule_type) {
        case "field_exists":
          if (value === undefined || value === null) {
            return false;
          }
          if (rule.expected_value !== undefined && value !== rule.expected_value) {
            return false;
          }
          break;

        case "field_equals":
          if (value !== rule.expected_value) {
            return false;
          }
          break;

        case "field_matches":
          if (!rule.pattern || typeof value !== "string") {
            return false;
          }
          const regex = new RegExp(rule.pattern);
          if (!regex.test(value)) {
            return false;
          }
          break;

        case "value_in_range":
          if (typeof value !== "number") {
            return false;
          }
          if (rule.min !== undefined && value < rule.min) {
            return false;
          }
          if (rule.max !== undefined && value > rule.max) {
            return false;
          }
          break;

        default:
          return false;
      }
    }
    return true;
  }

  protected getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  protected extractMetadata(event: ExternalEvent, mapping: SignalMapping): Record<string, boolean | undefined> {
    const metadata: Record<string, boolean | undefined> = {};

    if (!mapping.metadata_extraction) {
      return metadata;
    }

    const extraction = mapping.metadata_extraction;

    if (extraction.has_human_review) {
      const value = this.getNestedValue(event, extraction.has_human_review);
      metadata.has_human_review = Boolean(value);
    }

    if (extraction.is_cross_system) {
      const value = this.getNestedValue(event, extraction.is_cross_system);
      metadata.is_cross_system = Boolean(value);
    }

    if (extraction.requires_approval) {
      const value = this.getNestedValue(event, extraction.requires_approval);
      metadata.requires_approval = Boolean(value);
    }

    if (extraction.external_side_effect) {
      const value = this.getNestedValue(event, extraction.external_side_effect);
      metadata.external_side_effect = Boolean(value);
    }

    return metadata;
  }

  protected checkForbiddenFields(event: ExternalEvent): string[] {
    const violations: string[] = [];
    const stack: Array<{ obj: unknown; path: string }> = [{ obj: event, path: "" }];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || !current.obj || typeof current.obj !== "object") {
        continue;
      }

      for (const [key, value] of Object.entries(current.obj as Record<string, unknown>)) {
        const fullPath = current.path ? `${current.path}.${key}` : key;

        const forbidden = this.mapping.forbidden_fields.find((f) => f.field_name === key);
        if (forbidden) {
          violations.push(`${fullPath}: ${forbidden.reason}`);
        }

        if (value && typeof value === "object") {
          stack.push({ obj: value, path: fullPath });
        }
      }
    }

    return violations;
  }

  getConnectorName(): string {
    return this.mapping.connector_metadata.connector_name;
  }

  getConnectorVersion(): string {
    return this.mapping.connector_metadata.connector_version;
  }

  getVendor(): string {
    return this.mapping.connector_metadata.vendor;
  }

  getToolClass(): string {
    return this.mapping.connector_metadata.tool_class;
  }
}
