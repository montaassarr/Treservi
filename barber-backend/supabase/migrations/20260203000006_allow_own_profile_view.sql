-- Allow users to view their own staff profile regardless of salon association
-- This is critical for Super Admins who have salon_id = NULL

CREATE POLICY "Users can view own profile"
ON public.staff
FOR SELECT
USING (auth.uid() = id);

-- Ensure this policy doesn't conflict or is effectively additive (RLS is OR by default)
