import { aiValueEngine } from "@fluencytracr/shared";

import {
  readCanonicalClaimTrace,
  type CanonicalClaimTraceDependencies
} from "../src/services/canonical-claim-trace.service";

const authorizedInput = {
  hypothesisVersion: 1,
  planVersion: 2,
  measurementCellVersion: 3,
  metricId: "support_median_resolution_hours" as const,
  measurementUnit: "hours" as const,
  approvedDirection: "DECREASE" as const,
  movement: {
    metric_id: "support_median_resolution_hours" as const,
    measurement_unit: "hours" as const,
    baseline_value: 18.4,
    comparison_value: 15.1,
    absolute_delta: -3.3,
    percent_change: -17.934783,
    observed_direction: "DECREASE" as const,
    approved_metric_direction: "DECREASE" as const,
    claim_label: "OBSERVED_NON_ATTRIBUTABLE" as const
  },
  policyState: aiValueEngine.aggregateClaimPolicyState(),
  caveats: [...aiValueEngine.AGGREGATE_CLAIM_CAVEATS]
};

const packetId = `aggregate_packet_${"1".repeat(64)}_${"2".repeat(64)}`;
const bindingId = `canonical_identity_binding_${"4".repeat(64)}`;

describe("canonical claim trace service", () => {
  it("authorizes only after two matching complete BOUND readbacks", async () => {
    const dependencies: CanonicalClaimTraceDependencies = {
      readPacketIdByBindingId: jest.fn().mockResolvedValue(packetId),
      readReadout: jest
        .fn()
        .mockResolvedValueOnce({
          html: "<!doctype html>",
          canonicalIdentityState: "BOUND",
          sourceBound: true,
          traceSource: {
            projectionInput: authorizedInput,
            verificationCommitment: "3".repeat(64)
          }
        })
        .mockResolvedValueOnce({
          html: "<!doctype html>",
          canonicalIdentityState: "BOUND",
          sourceBound: true,
          traceSource: {
            projectionInput: authorizedInput,
            verificationCommitment: "3".repeat(64)
          }
        })
    };

    await expect(
      readCanonicalClaimTrace("org-northstar", bindingId, dependencies)
    ).resolves.toEqual(aiValueEngine.buildCanonicalClaimTraceAuthorized(authorizedInput));
    expect(dependencies.readPacketIdByBindingId).toHaveBeenCalledWith(
      "org-northstar",
      bindingId
    );
    expect(dependencies.readReadout).toHaveBeenCalledTimes(2);
    expect(dependencies.readReadout).toHaveBeenNthCalledWith(
      1,
      "org-northstar",
      packetId
    );
    expect(dependencies.readReadout).toHaveBeenNthCalledWith(
      2,
      "org-northstar",
      packetId
    );
  });

  it("returns the exact fixed HOLD when the final verification commitment changes", async () => {
    const dependencies: CanonicalClaimTraceDependencies = {
      readPacketIdByBindingId: jest.fn().mockResolvedValue(packetId),
      readReadout: jest
        .fn()
        .mockResolvedValueOnce({
          html: "<!doctype html>",
          canonicalIdentityState: "BOUND",
          sourceBound: true,
          traceSource: {
            projectionInput: authorizedInput,
            verificationCommitment: "3".repeat(64)
          }
        })
        .mockResolvedValueOnce({
          html: "<!doctype html>",
          canonicalIdentityState: "BOUND",
          sourceBound: true,
          traceSource: {
            projectionInput: authorizedInput,
            verificationCommitment: "5".repeat(64)
          }
        })
    };

    await expect(
      readCanonicalClaimTrace("org-northstar", bindingId, dependencies)
    ).resolves.toEqual(aiValueEngine.canonicalClaimTraceFixedHold());
    expect(dependencies.readReadout).toHaveBeenCalledTimes(2);
    expect(dependencies.readReadout).toHaveBeenNthCalledWith(
      1,
      "org-northstar",
      packetId
    );
    expect(dependencies.readReadout).toHaveBeenNthCalledWith(
      2,
      "org-northstar",
      packetId
    );
  });
});
