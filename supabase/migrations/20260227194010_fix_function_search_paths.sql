/*
  # Fix Function Search Paths

  1. Changes
    - Set search_path explicitly for all functions to prevent security issues
    - Functions with mutable search_path can be exploited by attackers
    - Setting a fixed search_path makes functions SECURITY DEFINER safe

  2. Security Impact
    - Prevents search_path manipulation attacks
    - Ensures functions always use the intended schema
    - Critical for SECURITY DEFINER functions

  3. Functions Updated
    - calculate_total_hours
    - update_updated_at
    - tt_calculate_total_hours
*/

-- Fix calculate_total_hours function
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix tt_calculate_total_hours function
CREATE OR REPLACE FUNCTION tt_calculate_total_hours()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;