-- Run this in Supabase SQL Editor
-- This simplifies unavailability to a single date and specific lessons.

ALTER TABLE space_maintenance
  ALTER COLUMN unavailable_from TYPE date,
  DROP COLUMN IF EXISTS unavailable_to,
  ADD COLUMN IF NOT EXISTS unavailable_lessons integer[] DEFAULT NULL;

COMMENT ON COLUMN space_maintenance.unavailable_from IS 'The specific date of the planned unavailability';
COMMENT ON COLUMN space_maintenance.unavailable_lessons IS 'Specific lesson indices (0-indexed) that are unavailable. If NULL or empty, the whole day is blocked.';
