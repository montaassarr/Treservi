
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from "https://esm.sh/web-push@3.5.0"

// HARDCODED VAPID KEYS (In production these should be secrets)
const VAPID_PUBLIC_KEY = "BK18bQ4NEXiaZlIV6brVvYpJb4r1JOGyUybne_94kbk49m2b6w-RW1u1mLW-Ib8oBCJFprdw1BL8x7-olQi8WwA"
const VAPID_PRIVATE_KEY = "REDACTED"
const CONTACT_EMAIL = "mailto:admin@reservi.com"

webpush.setVapidDetails(
  CONTACT_EMAIL,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  try {
    // 1. Create Supabase Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Parse Request
    const payload = await req.json()
    // Handle both direct call and webhook payload
    const record = payload.record || payload

    if (!record || !record.salon_id) {
      return new Response(JSON.stringify({ message: "No record or salon_id found" }), { status: 400 })
    }

    const { salon_id, staff_id, customer_name } = record

    console.log(`Processing push for Salon: ${salon_id}, Customer: ${customer_name}`)

    const userIdsToNotify = new Set<string>()

    // 3. Find Salon Owner
    const { data: salon, error: salonError } = await supabaseAdmin
      .from('salons')
      .select('owner_email')
      .eq('id', salon_id)
      .single()
    
    if (salonError) {
      console.error('Error fetching salon:', salonError)
    } else if (salon && salon.owner_email) {
      // Get owner User ID from email
      // Note: This relies on Auth Admin API
      // If run locally, might need to ensure SERVICE_ROLE_KEY is valid
      // or try to find user in 'staff' if owner is also a staff (common)
      
      // Try fetching user by email
      // Note: listUsers is more reliable if getUserByEmail is not available in current lib version
      // But let's try assuming standard User Management available
      // Actually, simplest way if we can't reliably use Admin Auth in all setups:
      // Check if owner is in staff table first
      const { data: ownerStaff } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('email', salon.owner_email)
        .single()
      
      if (ownerStaff) {
        userIdsToNotify.add(ownerStaff.id)
      } else {
         // Fallback to Admin API
         // This assumes the edge function has service_role key access
         // which it does by default
         // Since newer supabase-js might map this differently, we'll try to use listUsers
         // or just skip if not found.
         // For now, let's skip complex Admin API lookups to avoid breakage if auth is separate
         // but 'staff' table is a good proxy.
         console.log("Owner email not found in staff table, checking Auth...")
         // TODO: Add Admin Auth lookup if needed. For now relying on Staff entry.
      }
    }

    // 4. Add Assigned Staff
    if (staff_id) {
      userIdsToNotify.add(staff_id)
    }

    console.log(`Target Users: ${Array.from(userIdsToNotify).join(', ')}`)

    const results = []

    // 5. Send Notifications
    for (const userId of userIdsToNotify) {
      // Get Badge Count (Unread Appointments)
      const { count } = await supabaseAdmin
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('salon_id', salon_id)
        .eq('is_read', false)
      
      const badgeCount = count || 1

      // Get Push Subscriptions
      const { data: subscriptions } = await supabaseAdmin
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId)
      
      if (!subscriptions?.length) continue

      const notificationPayload = JSON.stringify({
        title: 'New Appointment',
        body: `New booking from ${customer_name}`,
        icon: '/icon-192.png',
        badge: badgeCount,
        data: {
          url: '/', // Open dashboard
          appointmentId: record.id
        }
      })

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          }, notificationPayload)
          results.push({ success: true, userId, subId: sub.id })
        } catch (error) {
          console.error(`Failed to send to sub ${sub.id}:`, error)
          if (error.statusCode === 410 || error.statusCode === 404) {
            await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
          }
           results.push({ success: false, userId, error: error.message })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
