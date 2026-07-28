import { acquireCohortProducerAuthorityLock } from "../src/repositories/cohort-producer-authority.repository";
import { acquireOutcomeEvidenceFamilyLock } from "../src/repositories/outcome-evidence.repository";

describe("C.0 advisory lock execution", () => {
  it.each([
    [
      "outcome evidence family lock",
      (client: any) =>
        acquireOutcomeEvidenceFamilyLock(client, {
          orgId: "org_alpha",
          workflowId: "workflow_alpha",
          jbtdId: "jbtd_alpha",
          personaId: "persona_alpha"
        })
    ],
    [
      "cohort producer authority lock",
      (client: any) =>
        acquireCohortProducerAuthorityLock(
          client,
          "org_alpha",
          "producer_primary"
        )
    ]
  ])(
    "executes the %s without deserializing pg_advisory_xact_lock's void result",
    async (_name, acquireLock) => {
      const client = {
        $executeRaw: jest.fn(async () => 0),
        $queryRaw: jest.fn(async () => {
          throw new Error("Failed to deserialize column of type 'void'");
        })
      };

      await expect(acquireLock(client)).resolves.toBeUndefined();
      expect(client.$executeRaw).toHaveBeenCalledTimes(1);
      expect(client.$queryRaw).not.toHaveBeenCalled();
    }
  );
});
