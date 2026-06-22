
-- Deduplicate phase_allocations: keep the earliest record per (phase_id, project_scope_id), 
-- set its hours to 1/4 of the sum (since all have exactly 4 duplicates with identical hours each)
-- Step 1: Delete all but the earliest record per group
DELETE FROM phase_allocations
WHERE id NOT IN (
  SELECT DISTINCT ON (phase_id, project_scope_id) id
  FROM phase_allocations
  WHERE project_scope_id IS NOT NULL
  ORDER BY phase_id, project_scope_id, created_at ASC
)
AND project_scope_id IS NOT NULL;
