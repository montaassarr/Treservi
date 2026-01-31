import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://barber-sigma-wheat.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

const getCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin && allowedOrigins.has(origin) ? origin : '*'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
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
    const corsHeaders = getCorsHeaders(req.headers.get('Origin'))
    return new Response('ok', {
      status: 200,
      headers: corsHeaders,
    })
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

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''

    const corsHeaders = getCorsHeaders(req.headers.get('Origin'))

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: authUserData, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !authUserData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid access token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate input
    if (!fullName || !email || !password || !salonId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: salonData, error: salonError } = await supabaseClient
      .from('salons')
      .select('id, owner_email')
      .eq('id', salonId)
      .maybeSingle()

    if (salonError || !salonData) {
      return new Response(
        JSON.stringify({ error: 'Invalid salon ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: ownerStaffData } = await supabaseClient
      .from('staff')
      .select('role')
      .eq('id', authUserData.user.id)
      .eq('salon_id', salonId)
      .maybeSingle()

    const isOwner = salonData.owner_email === authUserData.user.email || ownerStaffData?.role === 'owner'

    if (!isOwner) {
      return new Response(
        JSON.stringify({ error: 'Access denied: only salon owners can create staff' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create user in auth.users with service role
    const { data: userData, error: createUserError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        specialty,
        salon_id: salonId,
      },
    })

    if (createUserError) {
      console.error('User creation error:', createUserError)
      return new Response(
        JSON.stringify({ error: createUserError.message }),
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
