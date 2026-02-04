-- Grant sequence permissions to service_role for book_number_seq

GRANT USAGE ON SEQUENCE book_number_seq TO service_role;
GRANT SELECT ON SEQUENCE book_number_seq TO service_role;
