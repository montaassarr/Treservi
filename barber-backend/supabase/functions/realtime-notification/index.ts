import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Create Supabase Admin Client
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

    // Parse request
    const payload = await req.json()
    const record = payload.record || payload

    if (!record || !record.salon_id) {
      return new Response(
        JSON.stringify({ error: "No record or salon_id found" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      )
    }

    const { salon_id, staff_id, customer_name, id: appointmentId } = record

    console.log(`[RealtimeNotification] Processing for Salon: ${salon_id}, Appointment: ${appointmentId}`)

    // Get users to notify
    const userIdsToNotify = new Set<string>()

    // 1. Add Salon Owner
    const { data: salon } = await supabaseAdmin
      .from('salons')
      .select('owner_email')
      .eq('id', salon_id)
      .single()
    
    if (salon?.owner_email) {
      const { data: ownerStaff } = await supabaseAdmin
        .from('staff')
        .select('id')
        .eq('email', salon.owner_email)
        .single()
      
      if (ownerStaff?.id) {
        userIdsToNotify.add(ownerStaff.id)
      }
    }

    // 2. Add Assigned Staff
    if (staff_id) {
      userIdsToNotify.add(staff_id)
    }

    console.log(`[RealtimeNotification] Notifying users: ${Array.from(userIdsToNotify).join(', ')}`)

    // 3. Fetch appointment details for rich notification
    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        staff:staff_id(full_name, avatar_url),
        service:service_id(name, price)
      `)
      .eq('id', appointmentId)
      .single()

    const staffName = (appointment?.staff as any)?.full_name || 'Unassigned'
    const serviceName = (appointment?.service as any)?.name || 'Service'
    const amount = (appointment?.service as any)?.price || appointment?.amount || 0

    // 4. Send realtime notifications to each user
    const results = []
    for (const userId of userIdsToNotify) {
      try {
        // Broadcast to the user's realtime channel
        const channelName = `notifications:${userId}`
        
        const response = await supabaseAdmin
          .channel(channelName)
          .send({
            type: 'broadcast',
            event: 'appointment_notification',
            payload: {
              appointmentId: appointmentId,
              title: `New Appointment • ${customer_name}`,
              body: `${serviceName} with ${staffName} at ${appointment?.appointment_date} ${appointment?.appointment_time}`,
              customerName: customer_name,
              staffName: staffName,
              serviceName: serviceName,
              amount: `${amount} DT`,
              salonId: salon_id,
              userId: userId,
              timestamp: new Date().toISOString()
            }
          })

        results.push({
          success: true,
          userId,
          message: 'Notification sent via realtime'
        })

        console.log(`[RealtimeNotification] Sent to ${userId}`)
      } catch (error) {
        console.error(`[RealtimeNotification] Error sending to ${userId}:`, error)
        results.push({
          success: false,
          userId,
          error: (error as Error).message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Realtime notifications processed',
        results
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    )

  } catch (error) {
    console.error('[RealtimeNotification] Error:', error)
    return new Response(
      JSON.stringify({
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
})
