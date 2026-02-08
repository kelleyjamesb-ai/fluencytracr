-- CreateTable
CREATE TABLE "FluencyEventIngest" (
    "event_id" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "schema_version" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "FluencyEventIngest_pkey" PRIMARY KEY ("event_id")
);
