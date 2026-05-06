import { ConnectorBase, ExternalEvent, InternalSignal, TransformResult, SignalMapping } from "./ConnectorBase";

export class DeclarativeConnector extends ConnectorBase {
  getInvalidMappedEvents(events: ExternalEvent[]): Array<{ event_type: string; timestamp: string; reason: string }> {
    const invalidEvents: Array<{ event_type: string; timestamp: string; reason: string }> = [];

    for (const event of events) {
      const matchingMappings = this.mapping.signal_mappings.filter(
        (m) => m.external_event_type === event.event_type
      );

      if (matchingMappings.length === 0) {
        continue;
      }

      const forbiddenViolations = this.checkForbiddenFields(event);
      if (forbiddenViolations.length > 0) {
        invalidEvents.push({
          event_type: event.event_type,
          timestamp: event.timestamp,
          reason: "forbidden_fields"
        });
        continue;
      }

      let matched = false;
      let missingSideEffect = false;

      for (const mapping of matchingMappings) {
        if (!this.validateEvent(event, mapping)) {
          continue;
        }
        const metadata = this.extractMetadata(event, mapping);
        if (mapping.requires_side_effect && !metadata.external_side_effect) {
          missingSideEffect = true;
          continue;
        }
        matched = true;
        break;
      }

      if (!matched) {
        invalidEvents.push({
          event_type: event.event_type,
          timestamp: event.timestamp,
          reason: missingSideEffect ? "missing_external_side_effect" : "validation_failed"
        });
      }
    }

    return invalidEvents;
  }

  transform(events: ExternalEvent[]): TransformResult {
    const signals: InternalSignal[] = [];
    const errors: string[] = [];

    for (const event of events) {
      const forbiddenViolations = this.checkForbiddenFields(event);
      if (forbiddenViolations.length > 0) {
        errors.push(`Event ${event.event_type} contains forbidden fields: ${forbiddenViolations.join(", ")}`);
        continue;
      }

      const matchingMappings = this.mapping.signal_mappings.filter(
        (m) => m.external_event_type === event.event_type
      );

      if (matchingMappings.length === 0) {
        errors.push(`No mapping found for event type: ${event.event_type}`);
        continue;
      }

      for (const mapping of matchingMappings) {
        if (!this.validateEvent(event, mapping)) {
          continue;
        }

        const metadata = this.extractMetadata(event, mapping);

        if (mapping.requires_side_effect && !metadata.external_side_effect) {
          errors.push(
            `Signal ${mapping.internal_signal_name} requires external_side_effect=true but event ${event.event_type} does not provide it`
          );
          continue;
        }

        signals.push({
          signal_name: mapping.internal_signal_name,
          tool_class: this.mapping.connector_metadata.tool_class,
          metadata: {
            has_human_review: metadata.has_human_review,
            is_cross_system: metadata.is_cross_system,
            requires_approval: metadata.requires_approval,
            external_side_effect: metadata.external_side_effect
          },
          count: 1
        });
      }
    }

    return {
      success: errors.length === 0,
      signals,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
