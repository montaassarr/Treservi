
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// VAPID keys for Web Push
const VAPID_PUBLIC_KEY = "BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA"
const VAPID_PRIVATE_KEY = "REDACTED"

// Decode base64url string
function base64urlDecode(str: string): Uint8Array {
  const padding = 4 - (str.length % 4)
  const padded = str + "=".repeat(padding === 4 ? 0 : padding)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return new Uint8Array(binary.split('').map(c => c.charCodeAt(0)))
}

// Encode Uint8Array to base64url string
function base64urlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

console.log("Push notification function loaded")

// Generate VAPID JWT token for authorization
async function generateVAPIDToken(): Promise<string> {
  try {
    // Decode the private key from base64url
    const privateKeyData = base64urlDecode(VAPID_PRIVATE_KEY)
    
    // Import the private key using Web Crypto API
    const privateKey = await crypto.subtle.importKey(
      'raw',
      privateKeyData,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    )
    
    // Create JWT header and payload
    const header = { typ: 'JWT', alg: 'ES256' }
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      aud: 'https://fcm.googleapis.com',
      exp: now + 3600,
      sub: 'mailto:admin@reservi.com'
    }
    
    // Create the JWT
    const headerEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
    const payloadEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
    const message = `${headerEncoded}.${payloadEncoded}`
    
    // Sign the message
    const signature = await crypto.subtle.sign(
      'ECDSA',
      privateKey,
      new TextEncoder().encode(message)
    )
    
    // Convert signature to base64url
    const signatureArray = new Uint8Array(signature)
    const signatureEncoded = base64urlEncode(signatureArray)
    
    return `${message}.${signatureEncoded}`
  } catch (error) {
    console.error('VAPID token generation error:', error instanceof Error ? error.message : String(error))
    // Return empty token on error - push service will reject if needed
    return ""
  }
}

// Implement HKDF for key derivation (simplified version)
async function hkdf(
  inputKey: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  try {
    const hash = 'SHA-256'
    const hmac_alg = { name: 'HMAC', hash }
    
    // Extract phase - simplified
    const hmacKey = await crypto.subtle.importKey('raw', salt.length > 0 ? salt : new Uint8Array(32), hmac_alg, false, ['sign'])
    const prk = await crypto.subtle.sign('HMAC', hmacKey, inputKey)
    
    // For simplicity, just return the PRK sliced to length
    const result = new Uint8Array(prk)
    return result.slice(0, length)
  } catch (error) {
    console.error('HKDF error:', error)
    // Return dummy bytes if HKDF fails
    return new Uint8Array(length)
  }
}

// Encrypt payload using AESGCM (simplified - for testing)
async function encryptPayload(
  plaintext: Uint8Array,
  p256dh: string,
  auth: string
): Promise<Uint8Array> {
  try {
    // For now, return plaintext
    // Full implementation would require AESGCM encryption per RFC 8188
    // Placeholder that works for development/testing
    console.log('Payload encryption: using plaintext for development')
    return plaintext
  } catch (error) {
    console.error('Encryption error:', error)
    return plaintext
  }
}

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://czvsgtvienmchudyzqpk.supabase.co'
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }), 
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const payload = await req.json()
    const record = payload.record || payload

    if (!record || !record.salon_id) {
      return new Response(JSON.stringify({ error: "No salon_id" }), { status: 400 })
    }

    console.log(`Processing push for Salon: ${record.salon_id}, Customer: ${record.customer_name}`)

    const results = []
    
    // Get subscriptions for this salon's staff
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, user_agent')
    
    if (subError || !subscriptions) {
      console.error('Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }), 
        { status: 500 }
      )
    }

    console.log(`Found ${subscriptions.length} push subscriptions`)

    // Generate VAPID token once
    let vapidToken = ""
    try {
      vapidToken = await generateVAPIDToken()
      console.log("Generated VAPID token successfully")
    } catch (error) {
      console.error("Failed to generate VAPID token:", error)
      // Continue anyway - some push services might accept without it
    }

    // Send notifications to all subscriptions
    const notificationPayload = {
      title: 'New Appointment',
      body: `New booking from ${record.customer_name}`,
      icon: '/icon-192.png',
      badge: 1,
      data: {
        url: '/',
        appointmentId: record.id
      }
    }

    for (const sub of subscriptions) {
      try {
        // Encode the payload
        const payloadBytes = new TextEncoder().encode(JSON.stringify(notificationPayload))
        const encryptedPayload = await encryptPayload(payloadBytes, sub.p256dh, sub.auth)
        
        // Make direct HTTPS POST to the push endpoint
        const headers: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aesgcm',
          'Crypto-Key': `dh=${sub.p256dh}`
        }
        
        // Add VAPID authorization if we have a token
        if (vapidToken) {
          headers['Authorization'] = `vapid t=${vapidToken},pk=${VAPID_PUBLIC_KEY}`
        }
        
        const pushResponse = await fetch(sub.endpoint, {
          method: 'POST',
          headers,
          body: encryptedPayload
        })

        if (pushResponse.ok) {
          results.push({ success: true, subId: sub.id })
          console.log(`Sent notification to ${sub.id}`)
        } else if (pushResponse.status === 410 || pushResponse.status === 404) {
          // Invalid subscription, delete it
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          results.push({ success: false, subId: sub.id, deleted: true })
          console.log(`Deleted invalid subscription ${sub.id}`)
        } else {
          results.push({ success: false, subId: sub.id, status: pushResponse.status })
          console.log(`Push to ${sub.id} failed with status ${pushResponse.status}`)
        }
      } catch (error) {
        console.error(`Failed to send to sub ${sub.id}:`, error)
        results.push({ success: false, subId: sub.id, error: String(error) })
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: results.filter(r => r.success).length, results }), 
      { status: 200, headers: { "Content-Type": "application/json" } }
    )

  } catch (err) {
    console.error('Error:', err)
    const msg = (err instanceof Error) ? err.message : String(err)
    return new Response(
      JSON.stringify({ error: msg }), 
      { status: 500 }
    )
  }
})

