-- Migration: Add unavailable_from and unavailable_to to space_maintenance
-- Run this in Supabase SQL Editor

ALTER TABLE space_maintenance
  ALTER COLUMN unavailable_from TYPE timestamptz,
  ALTER COLUMN unavailable_to TYPE timestamptz;

-- Optional comment
COMMENT ON COLUMN space_maintenance.unavailable_from IS 'Start timestamp of planned unavailability period';
COMMENT ON COLUMN space_maintenance.unavailable_to IS 'End timestamp of planned unavailability period. After this time the space is automatically treated as available.';
