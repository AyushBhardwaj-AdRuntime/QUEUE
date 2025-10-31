-- Fix search_path for create_waiting_list_for_hospital function
CREATE OR REPLACE FUNCTION public.create_waiting_list_for_hospital()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.waiting_lists (hospital_id, waiting_count, last_updated)
  VALUES (NEW.id, 0, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;