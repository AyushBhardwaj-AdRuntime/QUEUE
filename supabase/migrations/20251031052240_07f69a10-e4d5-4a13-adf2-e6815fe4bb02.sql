-- Add google_maps_link column to hospitals table
ALTER TABLE public.hospitals
ADD COLUMN google_maps_link text;