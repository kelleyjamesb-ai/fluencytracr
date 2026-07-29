import { aiValueEngine } from "@fluencytracr/shared";

import { readAiValueClaimPacketIdByBindingId } from "../repositories/ai-value-object.repository";
import { readAuthorizedAggregateClaim } from "./aggregate-claim-authorization.service";

export interface CanonicalClaimTraceDependencies {
  readPacketIdByBindingId: typeof readAiValueClaimPacketIdByBindingId;
  readReadout: typeof readAuthorizedAggregateClaim;
}

const defaultDependencies: CanonicalClaimTraceDependencies = {
  readPacketIdByBindingId: readAiValueClaimPacketIdByBindingId,
  readReadout: readAuthorizedAggregateClaim
};

export const readCanonicalClaimTrace = async (
  orgId: string,
  bindingId: string,
  dependencies: CanonicalClaimTraceDependencies = defaultDependencies
): Promise<aiValueEngine.CanonicalClaimTrace> => {
  const held = aiValueEngine.canonicalClaimTraceFixedHold;
  try {
    const packetId = await dependencies.readPacketIdByBindingId(orgId, bindingId);
    if (!packetId) return held();

    const first = await dependencies.readReadout(orgId, packetId);
    if (!first?.traceSource || first.canonicalIdentityState !== "BOUND") return held();

    const finalRead = await dependencies.readReadout(orgId, packetId);
    if (
      !finalRead?.traceSource ||
      finalRead.canonicalIdentityState !== "BOUND" ||
      finalRead.traceSource.verificationCommitment !==
        first.traceSource.verificationCommitment
    ) {
      return held();
    }
    return aiValueEngine.buildCanonicalClaimTraceAuthorized(
      finalRead.traceSource.projectionInput
    );
  } catch {
    return held();
  }
};
