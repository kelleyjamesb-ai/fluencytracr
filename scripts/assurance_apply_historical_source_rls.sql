-- CI uses `prisma db push` and baselines historical migrations. Reapply the
-- exact RLS posture established by:
-- - 20260522053000_add_outcome_evidence_ingestion
-- - 20260609220000_add_ai_value_objects
-- before installing C.1 so the post-push path is history-equivalent.
ALTER TABLE public.outcome_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_value_objects ENABLE ROW LEVEL SECURITY;
