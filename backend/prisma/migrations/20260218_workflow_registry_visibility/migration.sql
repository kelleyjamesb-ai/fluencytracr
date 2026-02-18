-- Workflow registry versioning and audit trail for workflow-level visibility.

CREATE TABLE "WorkflowRegistryEntry" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "riskClass" TEXT NOT NULL,
  "changeReason" TEXT,
  "actorSub" TEXT,
  "actorRole" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowRegistryEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowRegistryAuditEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "actorSub" TEXT,
  "actorRole" TEXT,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowRegistryAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowRegistryEntry_orgId_workflowId_version_key"
  ON "WorkflowRegistryEntry"("orgId", "workflowId", "version");

CREATE INDEX "WorkflowRegistryEntry_orgId_workflowId_createdAt_idx"
  ON "WorkflowRegistryEntry"("orgId", "workflowId", "createdAt");

CREATE INDEX "WorkflowRegistryAuditEvent_orgId_workflowId_createdAt_idx"
  ON "WorkflowRegistryAuditEvent"("orgId", "workflowId", "createdAt");

ALTER TABLE "WorkflowRegistryEntry"
  ADD CONSTRAINT "WorkflowRegistryEntry_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkflowRegistryAuditEvent"
  ADD CONSTRAINT "WorkflowRegistryAuditEvent_orgId_fkey"
  FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
