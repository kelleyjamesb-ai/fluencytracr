CREATE TABLE "ai_value_objects" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "object_type" TEXT NOT NULL,
  "object_id" TEXT NOT NULL,
  "schema_version" TEXT NOT NULL,
  "workflow_family" TEXT,
  "payload_json" JSONB NOT NULL,
  "validation_json" JSONB NOT NULL,
  "valid" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_value_objects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_value_objects_org_id_object_type_object_id_key"
  ON "ai_value_objects"("org_id", "object_type", "object_id");

CREATE INDEX "ai_value_objects_org_id_object_type_idx"
  ON "ai_value_objects"("org_id", "object_type");

CREATE INDEX "ai_value_objects_org_id_workflow_family_idx"
  ON "ai_value_objects"("org_id", "workflow_family");

ALTER TABLE public."ai_value_objects" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name text;
  restricted_roles text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH role_name IN ARRAY restricted_roles LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', 'ai_value_objects', role_name);
    END IF;
  END LOOP;
END
$$;
