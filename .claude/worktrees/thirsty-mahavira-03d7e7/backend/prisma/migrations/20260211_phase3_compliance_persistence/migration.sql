CREATE TABLE IF NOT EXISTS "PolicyDocument" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "rawText" TEXT NOT NULL,
  "sourceFormat" TEXT NOT NULL,
  "clauseCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PolicyMapping" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "controlsJson" JSONB NOT NULL,
  "unresolvedJson" JSONB NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PolicyMapping_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CanonicalControlStateHistory" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "controlName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "bucketStart" TEXT NOT NULL,
  "bucketEnd" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CanonicalControlStateHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ComplianceEvent" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "policyId" TEXT,
  "controlName" TEXT,
  "status" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB NOT NULL,
  "sourceEventId" TEXT,
  "sourceEventType" TEXT,
  "recomputedAt" TIMESTAMP(3),
  CONSTRAINT "ComplianceEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ComplianceDecision" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "mappingId" TEXT NOT NULL,
  "clauseId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "controlName" TEXT,
  "status" TEXT,
  "decidedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ComplianceDecision_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "PolicyDocument"
    ADD CONSTRAINT "PolicyDocument_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PolicyMapping"
    ADD CONSTRAINT "PolicyMapping_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "PolicyMapping"
    ADD CONSTRAINT "PolicyMapping_policyId_fkey"
    FOREIGN KEY ("policyId") REFERENCES "PolicyDocument"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CanonicalControlStateHistory"
    ADD CONSTRAINT "CanonicalControlStateHistory_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ComplianceEvent"
    ADD CONSTRAINT "ComplianceEvent_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ComplianceDecision"
    ADD CONSTRAINT "ComplianceDecision_orgId_fkey"
    FOREIGN KEY ("orgId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ComplianceDecision"
    ADD CONSTRAINT "ComplianceDecision_mappingId_fkey"
    FOREIGN KEY ("mappingId") REFERENCES "PolicyMapping"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "PolicyDocument_orgId_createdAt_idx"
  ON "PolicyDocument"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "PolicyMapping_orgId_policyId_generatedAt_idx"
  ON "PolicyMapping"("orgId", "policyId", "generatedAt");

CREATE INDEX IF NOT EXISTS "CanonicalControlStateHistory_orgId_controlName_updatedAt_idx"
  ON "CanonicalControlStateHistory"("orgId", "controlName", "updatedAt");

CREATE INDEX IF NOT EXISTS "ComplianceEvent_orgId_createdAt_idx"
  ON "ComplianceEvent"("orgId", "createdAt");

CREATE INDEX IF NOT EXISTS "ComplianceEvent_orgId_eventType_createdAt_idx"
  ON "ComplianceEvent"("orgId", "eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "ComplianceDecision_orgId_policyId_decidedAt_idx"
  ON "ComplianceDecision"("orgId", "policyId", "decidedAt");
