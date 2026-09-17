-- 012_atomic_problem_statement.sql
-- Provides an atomic stored procedure to select a problem statement for an event in a single transaction

CREATE OR REPLACE FUNCTION public.choose_problem_statement(p_event_id UUID, p_statement_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.event_problem_statements
  SET is_chosen = (id = p_statement_id)
  WHERE event_id = p_event_id;
END;
$$;
