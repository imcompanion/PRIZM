
-- Fix corrupted phase_allocations for project 1731d9d5-edb4-4206-b2c1-eb7a5b5038ca
-- Delete all existing
DELETE FROM phase_allocations
WHERE phase_id IN (
  SELECT id FROM project_phases WHERE project_id = '1731d9d5-edb4-4206-b2c1-eb7a5b5038ca'
);

-- Re-insert using proportional working-day distribution
-- Phase working days (weekdays only):
-- Set Up: 2025-01-01 to 2025-03-16 = ~53 working days
-- RTB: 2025-02-24 to 2025-05-17 = ~59 working days  
-- Creators & Contracting: 2025-04-13 to 2025-09-13 = ~109 working days
-- Content Creation: 2025-08-26 to 2025-12-05 = ~72 working days
-- Go Live: 2025-10-01 to 2026-01-10 = ~72 working days
-- Reporting & Wrap Up: 2025-12-16 to 2026-04-10 = ~82 working days
-- Total: ~447 working days

-- Using a CTE to calculate and insert
WITH phase_work_days AS (
  SELECT 
    id as phase_id,
    phase_name,
    sort_order,
    (SELECT COUNT(*) FROM generate_series(
      COALESCE(start_date, '2025-01-01'::date),
      COALESCE(end_date, '2026-04-10'::date),
      '1 day'::interval
    ) d WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) as work_days
  FROM project_phases
  WHERE project_id = '1731d9d5-edb4-4206-b2c1-eb7a5b5038ca'
),
total_wd AS (
  SELECT SUM(work_days) as total FROM phase_work_days
),
scope_phase AS (
  SELECT 
    ps.id as scope_id,
    ps.scoped_hours,
    pwd.phase_id,
    pwd.sort_order,
    pwd.work_days,
    t.total,
    ROUND((ps.scoped_hours * pwd.work_days / t.total)::numeric, 2) as hours
  FROM project_scopes ps
  CROSS JOIN phase_work_days pwd
  CROSS JOIN total_wd t
  WHERE ps.project_id = '1731d9d5-edb4-4206-b2c1-eb7a5b5038ca'
)
INSERT INTO phase_allocations (phase_id, project_scope_id, hours)
SELECT phase_id, scope_id, hours
FROM scope_phase
WHERE hours > 0;
