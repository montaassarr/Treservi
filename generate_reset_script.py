import os

MIGRATIONS_DIR = "barber-backend/supabase/migrations"
OUTPUT_FILE = "barber-backend/full_remote_reset.sql"

def main():
    files = sorted([f for f in os.listdir(MIGRATIONS_DIR) if f.endswith(".sql")])
    
    with open(OUTPUT_FILE, "w") as outfile:
        # Header: Nuclear Option
        outfile.write("-- FULL RESET SCRIPT FOR SUPABASE DASHBOARD\n")
        outfile.write("-- RUN THIS IN THE SQL EDITOR\n\n")
        
        outfile.write("-- 1. Drop Schema (Nuclear)\n")
        outfile.write("DROP SCHEMA IF EXISTS public CASCADE;\n")
        outfile.write("CREATE SCHEMA public;\n")
        outfile.write("GRANT ALL ON SCHEMA public TO postgres;\n")
        outfile.write("GRANT ALL ON SCHEMA public TO public;\n")
        outfile.write("-- Fix permissions for Storage/Auth if needed (optional but good)\n")
        outfile.write("GRANT USAGE ON SCHEMA public TO anon;\n")
        outfile.write("GRANT USAGE ON SCHEMA public TO authenticated;\n")
        outfile.write("GRANT USAGE ON SCHEMA public TO service_role;\n")
        outfile.write("\n\n")
        
        # Append all migrations
        for fname in files:
            path = os.path.join(MIGRATIONS_DIR, fname)
            outfile.write(f"-- ==========================================\n")
            outfile.write(f"-- MIGRATION: {fname}\n")
            outfile.write(f"-- ==========================================\n")
            with open(path, "r") as infile:
                outfile.write(infile.read())
            outfile.write("\n\n")
            
        print(f"Successfully generated {OUTPUT_FILE} with {len(files)} migrations.")

if __name__ == "__main__":
    main()
