import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { ConnectorMapping } from "./ConnectorBase";
import { DeclarativeConnector } from "./DeclarativeConnector";

const ValidationRuleSchema = z.object({
  rule_type: z.enum(["field_exists", "field_equals", "field_matches", "value_in_range"]),
  field_path: z.string(),
  expected_value: z.unknown().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional()
});

const SignalMappingSchema = z.object({
  external_event_type: z.string(),
  internal_signal_name: z.string(),
  requires_side_effect: z.boolean(),
  validation_rules: z.array(ValidationRuleSchema),
  metadata_extraction: z
    .object({
      has_human_review: z.string().optional(),
      is_cross_system: z.string().optional(),
      requires_approval: z.string().optional(),
      external_side_effect: z.string().optional()
    })
    .optional()
});

const ConnectorMappingSchema = z.object({
  connector_metadata: z.object({
    connector_name: z.string(),
    connector_version: z.string(),
    vendor: z.string(),
    tool_class: z.string()
  }),
  signal_mappings: z.array(SignalMappingSchema),
  forbidden_fields: z.array(
    z.object({
      field_name: z.string(),
      reason: z.string()
    })
  )
});

export class MappingLoader {
  static loadFromJSON(filePath: string): DeclarativeConnector {
    const content = fs.readFileSync(filePath, "utf-8");
    const rawMapping = JSON.parse(content);

    const validationResult = ConnectorMappingSchema.safeParse(rawMapping);
    if (!validationResult.success) {
      throw new Error(`Invalid connector mapping: ${validationResult.error.message}`);
    }

    const mapping: ConnectorMapping = validationResult.data;
    return new DeclarativeConnector(mapping);
  }

  static loadFromYAML(filePath: string): DeclarativeConnector {
    throw new Error("YAML loading requires js-yaml dependency. Use JSON format or install js-yaml.");
  }

  static loadFromDirectory(directoryPath: string): DeclarativeConnector[] {
    const connectors: DeclarativeConnector[] = [];
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const fullPath = path.join(directoryPath, file);
        try {
          const connector = MappingLoader.loadFromJSON(fullPath);
          connectors.push(connector);
        } catch (error) {
          console.error(`Failed to load connector from ${file}:`, error);
        }
      }
    }

    return connectors;
  }

  static validateMapping(mapping: unknown): { valid: boolean; errors?: string[] } {
    const validationResult = ConnectorMappingSchema.safeParse(mapping);
    if (!validationResult.success) {
      return {
        valid: false,
        errors: validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
      };
    }
    return { valid: true };
  }
}
