-- Fix appointment book_number_seq permission
-- Grant USAGE on the sequence to anon and authenticated roles

GRANT USAGE ON SEQUENCE book_number_seq TO anon, authenticated;
GRANT SELECT ON SEQUENCE book_number_seq TO anon, authenticated;
