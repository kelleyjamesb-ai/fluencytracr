-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FluencyScore" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "day" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "coverage" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "judgment" DOUBLE PRECISION NOT NULL,
    "velocity" DOUBLE PRECISION NOT NULL,
    "dataComplete" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FluencyScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "actorSub" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "prevHash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FluencyScore_organizationId_day_idx" ON "FluencyScore"("organizationId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_orgId_seq_key" ON "AuditEvent"("orgId", "seq");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FluencyScore" ADD CONSTRAINT "FluencyScore_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Audit immutability: BEFORE UPDATE trigger raises exception
CREATE OR REPLACE FUNCTION audit_event_no_update() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE on AuditEvent is forbidden — audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_update_trigger
  BEFORE UPDATE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_no_update();

-- Audit immutability: BEFORE DELETE trigger raises exception
CREATE OR REPLACE FUNCTION audit_event_no_delete() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'DELETE on AuditEvent is forbidden — audit records are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_delete_trigger
  BEFORE DELETE ON "AuditEvent"
  FOR EACH ROW EXECUTE FUNCTION audit_event_no_delete();

-- Revoke UPDATE and DELETE privileges on AuditEvent for the application role
REVOKE UPDATE, DELETE ON "AuditEvent" FROM fluency;
