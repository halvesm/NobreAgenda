-- Migration: Add unavailable_from and unavailable_to to space_maintenance
-- Run this in Supabase SQL Editor

ALTER TABLE space_maintenance
  ADD COLUMN IF NOT EXISTS unavailable_from date,
  ADD COLUMN IF NOT EXISTS unavailable_to date;

-- Optional comment
COMMENT ON COLUMN space_maintenance.unavailable_from IS 'Start date of planned unavailability period';
COMMENT ON COLUMN space_maintenance.unavailable_to IS 'End date of planned unavailability period (inclusive). After this date the space is automatically treated as available.';
