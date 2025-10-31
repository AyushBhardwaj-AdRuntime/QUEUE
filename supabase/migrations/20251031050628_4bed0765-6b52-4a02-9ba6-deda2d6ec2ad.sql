-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waiting_lists table
CREATE TABLE public.waiting_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  waiting_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospitals
CREATE POLICY "Hospitals are viewable by everyone"
ON public.hospitals
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create hospitals"
ON public.hospitals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hospitals"
ON public.hospitals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hospitals"
ON public.hospitals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for waiting_lists
CREATE POLICY "Waiting lists are viewable by everyone"
ON public.waiting_lists
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update waiting lists"
ON public.waiting_lists
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can insert waiting lists"
ON public.waiting_lists
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger to automatically create waiting list when hospital is created
CREATE OR REPLACE FUNCTION public.create_waiting_list_for_hospital()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.waiting_lists (hospital_id, waiting_count, last_updated)
  VALUES (NEW.id, 0, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_waiting_list_trigger
AFTER INSERT ON public.hospitals
FOR EACH ROW
EXECUTE FUNCTION public.create_waiting_list_for_hospital();

-- Create trigger for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hospitals_updated_at
BEFORE UPDATE ON public.hospitals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();