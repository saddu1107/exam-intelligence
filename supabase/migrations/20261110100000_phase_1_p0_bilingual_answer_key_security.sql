-- P0: prevent students from reading answer keys/explanations before submission.
-- Students access only prompt/options through a narrow authenticated RPC.
-- The base translation table remains admin-only through its existing RLS policy.

DROP POLICY IF EXISTS "Students read translations of published entries"
  ON public.question_bank_translations;

CREATE OR REPLACE FUNCTION public.get_published_question_translations(p_question_ids uuid[])
RETURNS TABLE (
  legacy_question_id uuid,
  language text,
  question_text text,
  options jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT e.legacy_question_id, tr.language, tr.question_text, tr.options
  FROM public.question_bank_entries AS e
  JOIN public.question_bank_translations AS tr
    ON tr.entry_id = e.id
  WHERE auth.uid() IS NOT NULL
    AND e.status = 'published'
    AND e.legacy_question_id = ANY (p_question_ids);
$function$;

REVOKE ALL ON FUNCTION public.get_published_question_translations(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_published_question_translations(uuid[]) TO authenticated;

COMMENT ON FUNCTION public.get_published_question_translations(uuid[])
IS 'Returns published bilingual question prompts and options only; never exposes answer keys or explanations.';
