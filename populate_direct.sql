-- Direct SQL Population Script
-- Run with: docker exec -i supabase-db psql -U postgres -d postgres -f - < populate_direct.sql

-- 1. Get or Create Salon
-- We assume "Hamdi Salon" exists, or we create it.
DO $$
DECLARE
  v_salon_id uuid;
  v_owner_id uuid;
  v_staff1_id uuid := uuid_generate_v4();
  v_staff2_id uuid := uuid_generate_v4();
  v_staff3_id uuid := uuid_generate_v4();
BEGIN
  -- Insert dummy user for Owner if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner@luxe.com') THEN
     v_owner_id := uuid_generate_v4();
     INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
     VALUES (v_owner_id, 'owner@luxe.com', 'scrypt_hashed_password', now(), '{"provider":"email","providers":["email"]}', '{}');
  ELSE
     SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@luxe.com';
  END IF;

  -- Create Salon
  INSERT INTO public.salons (name, owner_email, slug, address)
  VALUES ('Luxe Barber', 'owner@luxe.com', 'luxe-barber', '123 Main St, Cityville')
  ON CONFLICT DO NOTHING;
  
  -- Get Salon ID (Grab the one we just made or the existing Hamdi Salon if user prefers? Let's stick to Luxe Barber for clean test or Update Hamdi)
  -- The user has 'Hamdi Salon' slug 'hamdisalon'? Let's check existing DB content. 
  -- Actually, let's use the first salon found to attach data to.
  SELECT id INTO v_salon_id FROM public.salons LIMIT 1;
  
  IF v_salon_id IS NULL THEN
    RAISE EXCEPTION 'No salon found!';
  END IF;

  RAISE NOTICE 'Using Salon ID: %', v_salon_id;

  -- 2. Services
  INSERT INTO public.services (salon_id, name, price, duration, is_active)
  VALUES 
    (v_salon_id, 'Mens Haircut', 25.00, 30, true),
    (v_salon_id, 'Beard Trim', 15.00, 20, true),
    (v_salon_id, 'Full Service', 50.00, 60, true)
  ON CONFLICT DO NOTHING;

  -- 3. Staff Users & Records
  -- Staff 1
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'john.expert@example.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
    VALUES (v_staff1_id, 'john.expert@example.com', 'pass', now());
    
    INSERT INTO public.staff (id, salon_id, full_name, email, status, role)
    VALUES (v_staff1_id, v_salon_id, 'John Expert', 'john.expert@example.com', 'Active', 'staff');
  ELSE
    SELECT id INTO v_staff1_id FROM public.staff WHERE email = 'john.expert@example.com';
  END IF;

  -- Staff 2
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'sarah.styles@example.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
    VALUES (v_staff2_id, 'sarah.styles@example.com', 'pass', now());
    
    INSERT INTO public.staff (id, salon_id, full_name, email, status, role)
    VALUES (v_staff2_id, v_salon_id, 'Sarah Styles', 'sarah.styles@example.com', 'Active', 'staff');
  ELSE
    SELECT id INTO v_staff2_id FROM public.staff WHERE email = 'sarah.styles@example.com';
  END IF;

  -- Staff 3
  IF NOT EXISTS (SELECT 1 FROM public.staff WHERE email = 'mike.fade@example.com') THEN
    INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
    VALUES (v_staff3_id, 'mike.fade@example.com', 'pass', now());
    
    INSERT INTO public.staff (id, salon_id, full_name, email, status, role)
    VALUES (v_staff3_id, v_salon_id, 'Mike Fade', 'mike.fade@example.com', 'Active', 'staff');
  ELSE
    SELECT id INTO v_staff3_id FROM public.staff WHERE email = 'mike.fade@example.com';
  END IF;

  -- 4. Stations
  -- Clear existing for cleaner setup? Or Update.
  DELETE FROM public.stations WHERE salon_id = v_salon_id;
  
  INSERT INTO public.stations (salon_id, name, type, position_x, position_y, width, current_staff_id)
  VALUES
    (v_salon_id, 'Chair 1', 'chair', 100, 150, 96, v_staff1_id),
    (v_salon_id, 'Chair 2', 'chair', 300, 150, 96, v_staff2_id),
    (v_salon_id, 'Chair 3', 'chair', 500, 150, 96, v_staff3_id),
    (v_salon_id, 'Sofa 1', 'sofa', 100, 400, 192, null);

END $$;
