/**
 * Push Notification Edge Function
 * 
 * Sends push notifications to subscribed users via Web Push protocol.
 * Uses VAPID authentication for iOS, Android, and Desktop browsers.
 * 
 * Supports:
 * - Chrome/Android (FCM)
 * - Firefox (Mozilla Autopush)
 * - Safari/iOS (Apple Web Push)
 * 
 * Triggered by:
 * - Database triggers (new appointment inserts)
 * - Direct HTTP calls from the app
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// CONFIGURATION
// ============================================================================

// VAPID keys for Web Push authentication
// These MUST match the frontend VITE_VAPID_PUBLIC_KEY
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || 
  "BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA"

const VAPID_PRIVATE_KEY = REDACTED('VAPID_PRIVATE_KEY') || 
  "H5pOuWncwjpQZfs_fCRagPS0yU51ZWJ06HyeUP7JEPY"

const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@treservi.com'

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Decode base64url string to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  return Uint8Array.from(binary, c => c.charCodeAt(0))
}

/**
 * Encode Uint8Array to base64url string
 */
function base64urlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Generate ECDH key pair for encryption
 */
async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )
}

/**
 * Export public key to raw format
 */
async function exportPublicKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return new Uint8Array(raw)
}

/**
 * Import client public key for ECDH
 */
async function importClientPublicKey(p256dh: string): Promise<CryptoKey> {
  const keyData = base64urlDecode(p256dh)
  return await crypto.subtle.importKey(
    'raw',
    keyData.buffer as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
}

/**
 * HKDF key derivation
 */
async function hkdf(
  ikm: ArrayBuffer,
  salt: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Import IKM as HKDF key
  const ikmKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    'HKDF',
    false,
    ['deriveBits']
  )
  
  // Derive bits
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      info: info.buffer as ArrayBuffer
    },
    ikmKey,
    length * 8
  )
  
  return new Uint8Array(derived)
}

/**
 * Create info string for HKDF
 */
function createInfo(type: string, clientPublic: Uint8Array, serverPublic: Uint8Array): Uint8Array {
  const encoder = new TextEncoder()
  const typeBytes = encoder.encode(type)
  
  // Format: "Content-Encoding: <type>\0" + P-256 + "\0" + length + client + length + server
  const parts = [
    encoder.encode('Content-Encoding: '),
    typeBytes,
    new Uint8Array([0]),
    encoder.encode('P-256'),
    new Uint8Array([0]),
    new Uint8Array([0, 65]),  // Length of uncompressed P-256 point
    clientPublic,
    new Uint8Array([0, 65]),
    serverPublic
  ]
  
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  
  return result
}

/**
 * Encrypt payload using aes128gcm (RFC 8188)
 */
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  // Generate server ECDH key pair
  const serverKeyPair = await generateECDHKeyPair()
  const serverPublicKey = await exportPublicKey(serverKeyPair.publicKey)
  
  // Import client public key
  const clientPublicKey = await importClientPublicKey(p256dh)
  const clientPublicBytes = base64urlDecode(p256dh)
  
  // Derive shared secret via ECDH
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientPublicKey },
    serverKeyPair.privateKey,
    256
  )
  
  // Decode auth secret
  const authSecret = base64urlDecode(auth)
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // Derive PRK (pseudo-random key)
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0')
  const prk = await hkdf(sharedSecret, authSecret, authInfo, 32)
  
  // Derive content encryption key (CEK)
  const cekInfo = createInfo('aesgcm', clientPublicBytes, serverPublicKey)
  const contentKey = await hkdf(prk.buffer as ArrayBuffer, salt, cekInfo, 16)
  
  // Derive nonce
  const nonceInfo = createInfo('nonce', clientPublicBytes, serverPublicKey)
  const nonce = await hkdf(prk.buffer as ArrayBuffer, salt, nonceInfo, 12)
  
  // Import CEK for AES-GCM
  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentKey.buffer as ArrayBuffer,
    'AES-GCM',
    false,
    ['encrypt']
  )
  
  // Add padding (2 bytes of padding length + padding + payload)
  const payloadBytes = new TextEncoder().encode(payload)
  const paddingLength = 0
  const padded = new Uint8Array(2 + paddingLength + payloadBytes.length)
  padded[0] = (paddingLength >> 8) & 0xff
  padded[1] = paddingLength & 0xff
  padded.set(payloadBytes, 2 + paddingLength)
  
  // Encrypt with AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce.buffer as ArrayBuffer, tagLength: 128 },
    aesKey,
    padded
  )
  
  return {
    encrypted: new Uint8Array(encrypted),
    salt,
    serverPublicKey
  }
}

/**
 * Build VAPID JWK from raw public/private keys
 */
function buildVapidJwk(): JsonWebKey {
  const publicKeyBytes = base64urlDecode(VAPID_PUBLIC_KEY)
  if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
    throw new Error('Invalid VAPID public key format')
  }

  const x = publicKeyBytes.slice(1, 33)
  const y = publicKeyBytes.slice(33, 65)
  const d = base64urlDecode(VAPID_PRIVATE_KEY)

  if (d.length !== 32) {
    throw new Error('Invalid VAPID private key length')
  }

  return {
    kty: 'EC',
    crv: 'P-256',
    x: base64urlEncode(x),
    y: base64urlEncode(y),
    d: base64urlEncode(d),
    ext: true
  }
}

/**
 * Generate VAPID JWT for authorization
 */
async function generateVapidJwt(audience: string): Promise<string> {
  const jwk = buildVapidJwk()

  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )
  
  // Create JWT header and payload
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 3600,
    sub: VAPID_SUBJECT
  }
  
  const headerEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)))
  const payloadEncoded = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const message = `${headerEncoded}.${payloadEncoded}`
  
  // Sign the message (WebCrypto returns DER-encoded signature)
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(message)
  )
  
  // Convert signature from DER to raw format
  const signatureArray = new Uint8Array(signature)
  const signatureEncoded = base64urlEncode(derToRaw(signatureArray))
  
  return `${message}.${signatureEncoded}`
}

/**
 * Convert ECDSA signature from DER format to raw format
 */
function derToRaw(signature: Uint8Array): Uint8Array {
  // If already 64 bytes, assume it's raw
  if (signature.length === 64) {
    return signature
  }
  
  // Parse DER format: 0x30 [length] 0x02 [r-length] [r] 0x02 [s-length] [s]
  const raw = new Uint8Array(64)
  
  let offset = 2 // Skip 0x30 and total length
  
  // Parse R
  if (signature[offset] !== 0x02) return signature
  offset++
  const rLen = signature[offset++]
  let rStart = offset
  if (signature[rStart] === 0x00) {
    rStart++
  }
  const rBytes = signature.slice(rStart, offset + rLen)
  raw.set(rBytes, 32 - rBytes.length)
  offset += rLen
  
  // Parse S
  if (signature[offset] !== 0x02) return signature
  offset++
  const sLen = signature[offset++]
  let sStart = offset
  if (signature[sStart] === 0x00) {
    sStart++
  }
  const sBytes = signature.slice(sStart, offset + sLen)
  raw.set(sBytes, 64 - sBytes.length)
  
  return raw
}

/**
 * Get the audience (origin) from the push endpoint
 */
function getAudience(endpoint: string): string {
  const url = new URL(endpoint)
  return url.origin
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Parse request payload
    const payload = await req.json()
    const record = payload.record || payload

    // Validate input
    if (!record?.salon_id) {
      return new Response(
        JSON.stringify({ error: 'Missing salon_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      salon_id,
      staff_id,
      customer_name,
      id: appointmentId,
      service_id
    } = record

    console.log(`[PushNotification] Processing for salon ${salon_id}, appointment ${appointmentId}`)

    // Get appointment details for rich notification
    let serviceName = 'Service'
    let appointmentTime = ''
    
    if (service_id) {
      const { data: service } = await supabaseAdmin
        .from('services')
        .select('name')
        .eq('id', service_id)
        .single()
      
      serviceName = service?.name || 'Service'
    }

    if (record.appointment_date && record.appointment_time) {
      appointmentTime = `${record.appointment_date} ${record.appointment_time}`
    }

    // Get users to notify (salon owner + assigned staff)
    const userIdsToNotify = new Set<string>()

    // 1. Get salon owner
    const { data: staffMembers } = await supabaseAdmin
      .from('staff')
      .select('id, role')
      .eq('salon_id', salon_id)

    if (staffMembers) {
      for (const staff of staffMembers) {
        if (staff.role === 'owner') {
          userIdsToNotify.add(staff.id)
        }
      }
    }

    // 2. Add assigned staff
    if (staff_id) {
      userIdsToNotify.add(staff_id)
    }

    console.log(`[PushNotification] Notifying users: ${Array.from(userIdsToNotify).join(', ')}`)

    // Get push subscriptions for this salon (covers owner even if not in staff)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, platform, created_at')
      .eq('salon_id', salon_id)

    if (subError || !subscriptions) {
      console.error('[PushNotification] Error fetching subscriptions:', subError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[PushNotification] Found ${subscriptions.length} subscriptions`)

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: `🎉 New Appointment`,
      body: `${customer_name} booked ${serviceName}${appointmentTime ? ` at ${appointmentTime}` : ''}`,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      tag: `appointment-${appointmentId}`,
      data: {
        url: '/dashboard',
        appointmentId,
        customerName: customer_name,
        serviceName,
        salonId: salon_id
      }
    })

    const selectedSubscriptions = subscriptions

    // Send to all subscriptions
    const results = []
    
    for (const sub of selectedSubscriptions) {
      try {
        console.log(`[PushNotification] Sending to ${sub.id} (${sub.platform})`)
        
        // Get audience from endpoint
        const audience = getAudience(sub.endpoint)
        
        // Encrypt the payload
        const { encrypted, salt, serverPublicKey } = await encryptPayload(
          notificationPayload,
          sub.p256dh,
          sub.auth
        )
        
        // Generate VAPID JWT
        let vapidJwt = ''
        try {
          vapidJwt = await generateVapidJwt(audience)
        } catch (jwtError) {
          console.error('[PushNotification] VAPID JWT generation failed:', jwtError)
          // Continue without JWT - some services might still work
        }

        // Build the encrypted body with headers
        // Format: salt (16) + record size (4) + key length (1) + key (65) + encrypted data
        const recordSize = 4096
        const body = new Uint8Array(16 + 4 + 1 + serverPublicKey.length + encrypted.length)
        let offset = 0
        
        // Salt
        body.set(salt, offset)
        offset += 16
        
        // Record size (big-endian uint32)
        body[offset++] = (recordSize >> 24) & 0xff
        body[offset++] = (recordSize >> 16) & 0xff
        body[offset++] = (recordSize >> 8) & 0xff
        body[offset++] = recordSize & 0xff
        
        // Key length
        body[offset++] = serverPublicKey.length
        
        // Server public key
        body.set(serverPublicKey, offset)
        offset += serverPublicKey.length
        
        // Encrypted data
        body.set(encrypted, offset)

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/octet-stream',
          'Content-Encoding': 'aes128gcm',
          'TTL': '86400', // 24 hours
          'Urgency': 'high',
          // Some services (Safari/Apple) expect the VAPID public key in Crypto-Key
          'Crypto-Key': `p256ecdsa=${VAPID_PUBLIC_KEY}`
        }

        // Add VAPID authorization
        if (vapidJwt) {
          headers['Authorization'] = `vapid t=${vapidJwt},k=${VAPID_PUBLIC_KEY}`
        }

        // Send the push
        const pushResponse = await fetch(sub.endpoint, {
          method: 'POST',
          headers,
          body: body
        })

        if (pushResponse.ok || pushResponse.status === 201) {
          results.push({ success: true, subId: sub.id, status: pushResponse.status })
          console.log(`[PushNotification] ✓ Sent to ${sub.id}`)
          
          // Update last_used_at
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id)
            
        } else if (pushResponse.status === 410 || pushResponse.status === 404) {
          // Subscription expired or invalid - delete it
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
          
          results.push({ success: false, subId: sub.id, deleted: true, status: pushResponse.status })
          console.log(`[PushNotification] Deleted invalid subscription ${sub.id}`)
          
        } else {
          const errorText = await pushResponse.text()
          results.push({ 
            success: false, 
            subId: sub.id, 
            status: pushResponse.status,
            error: errorText 
          })
          console.error(`[PushNotification] Failed for ${sub.id}: ${pushResponse.status} - ${errorText}`)
        }
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        results.push({ success: false, subId: sub.id, error: errorMsg })
        console.error(`[PushNotification] Error for ${sub.id}:`, errorMsg)
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[PushNotification] Complete: ${successful} sent, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[PushNotification] Error:', errorMsg)
    
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
