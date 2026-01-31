import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface DeleteSalonRequest {
  salonId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user auth context
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { salonId }: DeleteSalonRequest = await req.json();
    if (!salonId) {
      console.error("No salonId provided");
      return new Response(
        JSON.stringify({ error: "salonId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-salon] Starting deletion for salon: ${salonId}`);

    // Call the RPC function with user context preserved
    const { data, error } = await supabaseClient.rpc("delete_salon_by_super_admin", {
      p_salon_id: salonId,
    });

    if (error) {
      console.error("[delete-salon] RPC error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "RPC function failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (data?.success === false) {
      console.error("[delete-salon] RPC returned error:", data.error);
      return new Response(
        JSON.stringify({ error: data.error || "Unknown RPC error" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-salon] Success. Deleted ${data?.deleted_staff_count || 0} staff`);

    return new Response(
      JSON.stringify({
        message: "Salon deleted successfully",
        deletedStaffCount: data?.deleted_staff_count || 0,
        deletedStaffIds: data?.staff_ids || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMsg = (error as Error).message || "Unknown error";
    console.error("[delete-salon] Catch error:", errorMsg, error);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
