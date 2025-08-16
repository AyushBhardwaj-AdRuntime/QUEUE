-- Create hospitals table
CREATE TABLE public.hospitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waiting_lists table  
CREATE TABLE public.waiting_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  waiting_count INTEGER NOT NULL DEFAULT 0 CHECK (waiting_count >= 0),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_lists ENABLE ROW LEVEL SECURITY;

-- RLS policies for hospitals
CREATE POLICY "Hospitals are viewable by everyone" 
ON public.hospitals 
FOR SELECT 
USING (true);

CREATE POLICY "Hospital owners can update their hospital" 
ON public.hospitals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create hospitals" 
ON public.hospitals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for waiting_lists
CREATE POLICY "Waiting lists are viewable by everyone" 
ON public.waiting_lists 
FOR SELECT 
USING (true);

CREATE POLICY "Hospital owners can manage their waiting lists" 
ON public.waiting_lists 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.hospitals 
    WHERE hospitals.id = waiting_lists.hospital_id 
    AND hospitals.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_hospitals_updated_at
  BEFORE UPDATE ON public.hospitals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create waiting list entry
CREATE OR REPLACE FUNCTION public.handle_new_hospital()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.waiting_lists (hospital_id, waiting_count)
  VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create waiting list when hospital is created
CREATE TRIGGER on_hospital_created
  AFTER INSERT ON public.hospitals
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_hospital();

-- Create indexes for better performance
CREATE INDEX idx_hospitals_location ON public.hospitals(latitude, longitude);
CREATE INDEX idx_hospitals_user_id ON public.hospitals(user_id);
CREATE INDEX idx_waiting_lists_hospital_id ON public.waiting_lists(hospital_id);