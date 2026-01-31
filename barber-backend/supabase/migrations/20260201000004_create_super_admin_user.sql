-- Create super admin user for testing and administration
-- This will be a staff member with is_super_admin=true

-- First, check if super admin already exists to avoid duplicates
DO $$
DECLARE
  v_user_id uuid;
  v_salon_id uuid;
BEGIN
  -- Check if super admin already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@reservi.com') THEN
    
    -- Get or create a system salon for super admin
    SELECT id INTO v_salon_id FROM public.salons WHERE slug = 'system-admin';
    
    IF v_salon_id IS NULL THEN
      INSERT INTO public.salons (name, slug, owner_email, status)
      VALUES ('System Admin', 'system-admin', 'superadmin@reservi.com', 'active')
      RETURNING id INTO v_salon_id;
    END IF;
    
    -- Create auth user (using service role would be better, but we'll use a migration approach)
    -- Note: In production, create this user via Supabase Dashboard or API
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'superadmin@reservi.com',
      crypt('SuperAdmin123!', gen_salt('bf')), -- Password: SuperAdmin123!
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"],"role":"super_admin"}'::jsonb,
      '{"full_name":"Super Admin","role":"super_admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO v_user_id;
    
    -- Create staff record with super admin flag
    INSERT INTO public.staff (
      id,
      salon_id,
      full_name,
      email,
      specialty,
      status,
      is_super_admin
    ) VALUES (
      v_user_id,
      v_salon_id,
      'Super Admin',
      'superadmin@reservi.com',
      'Administrator',
      'Active',
      true
    );
    
    RAISE NOTICE 'Super admin user created successfully';
  ELSE
    RAISE NOTICE 'Super admin user already exists';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres, service_role;

-- Ensure super admin can access everything
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
