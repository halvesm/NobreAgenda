-- Run this in Supabase SQL Editor
-- This reverts the previous timestamptz change and adds lesson-based locking

ALTER TABLE space_maintenance
  ALTER COLUMN unavailable_from TYPE date,
  ALTER COLUMN unavailable_to TYPE date,
  ADD COLUMN IF NOT EXISTS unavailable_lessons integer[] DEFAULT NULL;

COMMENT ON COLUMN space_maintenance.unavailable_from IS 'Start date of planned unavailability period';
COMMENT ON COLUMN space_maintenance.unavailable_to IS 'End date of planned unavailability period (inclusive)';
COMMENT ON COLUMN space_maintenance.unavailable_lessons IS 'Specific lesson indices (0-indexed) that are unavailable. If NULL or empty, the whole day is blocked.';
