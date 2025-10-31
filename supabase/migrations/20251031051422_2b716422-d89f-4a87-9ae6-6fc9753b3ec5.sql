-- Add pincode field and make latitude/longitude optional
ALTER TABLE public.hospitals
ADD COLUMN pincode text,
ALTER COLUMN latitude DROP NOT NULL,
ALTER COLUMN longitude DROP NOT NULL;

-- Add index for pincode searches
CREATE INDEX idx_hospitals_pincode ON public.hospitals(pincode);

-- Add function to calculate distance between two coordinates (in kilometers)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 numeric,
  lon1 numeric,
  lat2 numeric,
  lon2 numeric
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * 
      cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * 
      sin(radians(lat2))
    )
  );
END;
$$;