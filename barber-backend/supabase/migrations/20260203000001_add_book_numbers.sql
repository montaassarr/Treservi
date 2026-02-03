-- Create a sequence for auto-incrementing book numbers
CREATE SEQUENCE IF NOT EXISTS book_number_seq START 1000;

-- Add book_number column to appointments table (nullable first)
ALTER TABLE public.appointments 
ADD COLUMN book_number VARCHAR(50) UNIQUE;

-- Generate book numbers for existing appointments
UPDATE public.appointments 
SET book_number = 'RES-' || to_char(created_at, 'YYYY') || '-' || LPAD(nextval('book_number_seq')::text, 6, '0')
WHERE book_number IS NULL;

-- Make the column NOT NULL
ALTER TABLE public.appointments 
ALTER COLUMN book_number SET NOT NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_appointments_book_number ON public.appointments(book_number);

-- Create function to generate book numbers
CREATE OR REPLACE FUNCTION generate_book_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.book_number = '' OR NEW.book_number IS NULL THEN
    NEW.book_number := 'RES-' || to_char(NOW(), 'YYYY') || '-' || LPAD(nextval('book_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate book numbers on insert
DROP TRIGGER IF EXISTS trigger_generate_book_number ON public.appointments;
CREATE TRIGGER trigger_generate_book_number
BEFORE INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION generate_book_number();
