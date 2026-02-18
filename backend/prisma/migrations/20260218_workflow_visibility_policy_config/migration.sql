-- Versioned workflow visibility policy config per workflow registry version.

CREATE TABLE "WorkflowVisibilityPolicyConfig" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "registryVersion" INTEGER NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "lowMinEvents" INTEGER NOT NULL,
  "mediumMinEvents" INTEGER NOT NULL,
  "highMinEvents" INTEGER NOT NULL,
  "minWindowDays" INTEGER NOT NULL,
  "highSparseMinEvents" INTEGER NOT NULL,
  "highSparseMinWindowDays" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowVisibilityPolicyConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowVisibilityPolicyConfig_orgId_workflowId_registryVersion_key"
  ON "WorkflowVisibilityPolicyConfig"("orgId", "workflowId", "registryVersion");

CREATE INDEX "WorkflowVisibilityPolicyConfig_orgId_workflowId_createdAt_idx"
  ON "WorkflowVisibilityPolicyConfig"("orgId", "workflowId", "createdAt");

ALTER TABLE "WorkflowVisibilityPolicyConfig"
  ADD CONSTRAINT "WorkflowVisibilityPolicyConfig_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
