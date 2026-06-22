
DELETE FROM phase_allocations
WHERE phase_id IN (
  SELECT id FROM project_phases 
  WHERE project_id = '1731d9d5-edb4-4206-b2c1-eb7a5b5038ca'
  AND phase_name IN ('Set Up', 'Go Live')
);
