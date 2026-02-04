
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Push notification function loaded (proxy)")

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://czvsgtvienmchudyzqpk.supabase.co'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const targetUrl = `${supabaseUrl}/functions/v1/send-push-notification`

    const bodyText = await req.text()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (serviceRoleKey) {
      headers['Authorization'] = `Bearer ${serviceRoleKey}`
      headers['apikey'] = serviceRoleKey
    }

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyText
    })

    const responseText = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'

    return new Response(responseText, {
      status: upstream.status,
      headers: { ...corsHeaders, 'Content-Type': contentType }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

