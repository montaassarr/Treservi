import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
}

interface CreateStaffRequest {
  fullName: string
  email: string
  password: string
  specialty: string
  salonId: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { fullName, email, password, specialty, salonId }: CreateStaffRequest = await req.json()

    // Validate input
    if (!fullName || !email || !password || !salonId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create user in auth.users with service role
    const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        specialty,
        salon_id: salonId,
      },
    })

    if (userError) {
      console.error('User creation error:', userError)
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Insert staff profile linked to salon
    const { data: staffData, error: staffError } = await supabaseClient
      .from('staff')
      .insert({
        id: userData.user.id,
        full_name: fullName,
        email,
        specialty: specialty || 'Generalist',
        status: 'Active',
        salon_id: salonId,
      })
      .select()
      .single()

    if (staffError) {
      console.error('Staff insert error:', staffError)
      // Cleanup: delete the auth user if staff insert fails
      await supabaseClient.auth.admin.deleteUser(userData.user.id)
      
      return new Response(
        JSON.stringify({ error: staffError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: staffData, message: 'Staff member created successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
