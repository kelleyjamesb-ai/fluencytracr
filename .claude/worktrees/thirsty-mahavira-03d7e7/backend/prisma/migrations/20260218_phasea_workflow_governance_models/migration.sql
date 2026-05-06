-- Phase A governance persistence model: workflow version/current, org-level control config, baseline resets.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskClass') THEN
    CREATE TYPE "RiskClass" AS ENUM ('low', 'medium', 'high');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VisibilityState') THEN
    CREATE TYPE "VisibilityState" AS ENUM ('VISIBLE', 'NOT_ENOUGH_DATA_YET', 'NOT_SHOWN_SAFETY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DominantPattern') THEN
    CREATE TYPE "DominantPattern" AS ENUM (
      'CALIBRATED_FLUENCY',
      'BLIND_EFFICIENCY',
      'RECOVERY_MATURITY',
      'FRICTION_LOOP',
      'UNDERTRUST_AVOIDANCE'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "WorkflowRegistryVersion" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "riskClass" "RiskClass" NOT NULL,
  "changeReason" TEXT NOT NULL,
  "changedByUser" TEXT NOT NULL,
  "changedByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowRegistryVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WorkflowRegistryCurrent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "riskClass" "RiskClass" NOT NULL,
  "effectiveVersionId" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkflowRegistryCurrent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ControlConfigVersion" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "versionName" TEXT NOT NULL,
  "changeReason" TEXT NOT NULL,
  "changedByUser" TEXT NOT NULL,
  "changedByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "windowDaysLow" INTEGER NOT NULL,
  "windowDaysMedium" INTEGER NOT NULL,
  "windowDaysHigh" INTEGER NOT NULL,
  "minEventsLow" INTEGER NOT NULL,
  "minEventsMedium" INTEGER NOT NULL,
  "minEventsHigh" INTEGER NOT NULL,
  "requireVerificationHigh" BOOLEAN NOT NULL,
  CONSTRAINT "ControlConfigVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BaselineResetEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "controlConfigVersionId" TEXT NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" TEXT NOT NULL,
  "triggeredByUser" TEXT NOT NULL,
  "triggeredByRole" TEXT NOT NULL,
  CONSTRAINT "BaselineResetEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkflowRegistryVersion_orgId_workflowId_createdAt_idx"
  ON "WorkflowRegistryVersion"("orgId", "workflowId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowRegistryCurrent_orgId_workflowId_key"
  ON "WorkflowRegistryCurrent"("orgId", "workflowId");

CREATE INDEX IF NOT EXISTS "WorkflowRegistryCurrent_orgId_idx"
  ON "WorkflowRegistryCurrent"("orgId");

CREATE INDEX IF NOT EXISTS "ControlConfigVersion_orgId_createdAt_idx"
  ON "ControlConfigVersion"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "BaselineResetEvent_orgId_resetAt_idx"
  ON "BaselineResetEvent"("orgId", "resetAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowRegistryVersion_orgId_fkey'
  ) THEN
    ALTER TABLE "WorkflowRegistryVersion"
      ADD CONSTRAINT "WorkflowRegistryVersion_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WorkflowRegistryCurrent_orgId_fkey'
  ) THEN
    ALTER TABLE "WorkflowRegistryCurrent"
      ADD CONSTRAINT "WorkflowRegistryCurrent_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ControlConfigVersion_orgId_fkey'
  ) THEN
    ALTER TABLE "ControlConfigVersion"
      ADD CONSTRAINT "ControlConfigVersion_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BaselineResetEvent_orgId_fkey'
  ) THEN
    ALTER TABLE "BaselineResetEvent"
      ADD CONSTRAINT "BaselineResetEvent_orgId_fkey"
      FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
