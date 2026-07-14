import { PERSON_IDENTIFIER_FIELDS } from "@fluencytracr/shared";
import { z } from "zod";

const normalizeForbiddenFieldName = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const PERSON_IDENTIFIER_FIELD_SET = new Set(
  PERSON_IDENTIFIER_FIELDS.map(normalizeForbiddenFieldName)
);
const PERSON_IDENTIFIER_TOKENS = new Set([
  "user",
  "userid",
  "uid",
  "person",
  "employee",
  "actor",
  "account",
  "principal",
  "subject",
  "email",
  "phone",
  "name",
  "username",
  "identifier",
  "hash",
  "hashed"
]);

const fieldNameTokens = (value: string): string[] =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const ConnectorTimestampSchema = z.string().datetime({ offset: true });

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
  strict_input_paths?: boolean;
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
    const matchingMappings = this.mapping.signal_mappings.filter(
      (mapping) => mapping.external_event_type === event.event_type
    );
    const declaredPathValues = [
      "event_type",
      "timestamp",
      ...matchingMappings.flatMap((mapping) => [
        ...mapping.validation_rules.map((rule) => rule.field_path),
        ...Object.values(mapping.metadata_extraction ?? {})
      ])
    ];
    const declaredInputPaths = new Set<string>();
    const declaredContainerPaths = new Set<string>();
    for (const declaredPath of declaredPathValues) {
      const parts = declaredPath.split(".");
      for (let length = 1; length <= parts.length; length += 1) {
        const path = parts.slice(0, length).join(".");
        declaredInputPaths.add(path);
        if (length < parts.length) declaredContainerPaths.add(path);
      }
    }
    const booleanMetadataPaths = new Set(
      matchingMappings.flatMap((mapping) =>
        Object.values(mapping.metadata_extraction ?? {})
      )
    );
    const rulesByPath = new Map<string, ValidationRule[]>();
    for (const rule of matchingMappings.flatMap((mapping) => mapping.validation_rules)) {
      rulesByPath.set(rule.field_path, [...(rulesByPath.get(rule.field_path) ?? []), rule]);
    }

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || !current.obj || typeof current.obj !== "object") {
        continue;
      }

      for (const [key, value] of Object.entries(current.obj as Record<string, unknown>)) {
        const fullPath = current.path ? `${current.path}.${key}` : key;
        const pathSegments = fullPath.split(".");
        const normalizedAliases = pathSegments.map((_, index) =>
          normalizeForbiddenFieldName(pathSegments.slice(index).join("."))
        );
        const forbidden = this.mapping.forbidden_fields.find(
          (field) => normalizedAliases.includes(normalizeForbiddenFieldName(field.field_name))
        );
        const normalizedKey = normalizeForbiddenFieldName(key);
        const tokens = fieldNameTokens(key);
        const containsPersonIdentifier =
          PERSON_IDENTIFIER_FIELD_SET.has(normalizedKey) ||
          tokens.some((token) => PERSON_IDENTIFIER_TOKENS.has(token));
        const isDeclaredInputPath = !key.includes(".") && declaredInputPaths.has(fullPath);
        const containsUndeclaredId =
          this.mapping.strict_input_paths === true &&
          tokens.includes("id") &&
          !isDeclaredInputPath;
        const containsUndeclaredField =
          this.mapping.strict_input_paths === true && !isDeclaredInputPath;
        const isPlainObject =
          value !== null && typeof value === "object" && !Array.isArray(value);
        const rules = rulesByPath.get(fullPath) ?? [];
        const violatesRule = rules.some((rule) => {
          switch (rule.rule_type) {
            case "field_exists":
              return (
                value === undefined ||
                value === null ||
                (rule.expected_value !== undefined && value !== rule.expected_value)
              );
            case "field_equals":
              return value !== rule.expected_value;
            case "field_matches":
              return (
                !rule.pattern ||
                typeof value !== "string" ||
                !new RegExp(rule.pattern).test(value)
              );
            case "value_in_range":
              return (
                typeof value !== "number" ||
                (rule.min !== undefined && value < rule.min) ||
                (rule.max !== undefined && value > rule.max)
              );
            default:
              return true;
          }
        });
        const containsInvalidDeclaredValue =
          this.mapping.strict_input_paths === true &&
          isDeclaredInputPath &&
          ((declaredContainerPaths.has(fullPath) && !isPlainObject) ||
            (booleanMetadataPaths.has(fullPath) && typeof value !== "boolean") ||
            violatesRule ||
            (fullPath === "event_type" && typeof value !== "string") ||
            (fullPath === "timestamp" &&
              (!ConnectorTimestampSchema.safeParse(value).success ||
                typeof value !== "string" ||
                !Number.isFinite(Date.parse(value)))));
        if (
          forbidden ||
          containsPersonIdentifier ||
          containsUndeclaredId ||
          containsUndeclaredField ||
          containsInvalidDeclaredValue
        ) {
          const fallbackReason = containsPersonIdentifier || containsUndeclaredId
            ? "Privacy: Never collect direct person identifiers"
            : containsInvalidDeclaredValue
              ? "Privacy: Declared connector fields must match the compiled shape"
              : "Privacy: Undeclared connector fields are not accepted";
          violations.push(
            `${fullPath}: ${forbidden?.reason ?? fallbackReason}`
          );
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

  getMappedEventTypes(): string[] {
    return this.mapping.signal_mappings.map((mapping) => mapping.external_event_type);
  }
}
