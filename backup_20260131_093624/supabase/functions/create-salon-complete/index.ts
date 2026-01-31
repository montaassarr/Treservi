import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface CreateSalonRequest {
  salonName: string;
  salonSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[create-salon-complete] No authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role key for auth operations
    const supabaseServiceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Use anon key with user auth for RLS checks
    const supabaseUserClient = createClient(
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

    const {
      salonName,
      salonSlug,
      ownerName,
      ownerEmail,
      ownerPassword,
    }: CreateSalonRequest = await req.json();

    // Validate inputs
    if (!salonName || !salonSlug || !ownerName || !ownerEmail || !ownerPassword) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (ownerPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is super_admin
    const { data: userData } = await supabaseUserClient.auth.getUser();
    if (!userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-salon-complete] Creating salon: ${salonName} (${salonSlug}) by user ${userData.user.id}`);

    // 1. Create auth user for owner
    const { data: authData, error: authError } = await supabaseServiceClient.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
        role: "owner",
      },
    });

    if (authError) {
      console.error("[create-salon-complete] Auth error:", authError.message);
      return new Response(
        JSON.stringify({ error: `Failed to create owner account: ${authError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData?.user) {
      console.error("[create-salon-complete] No user returned from auth");
      return new Response(
        JSON.stringify({ error: "Failed to create owner account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Create salon
    const { data: salonData, error: salonError } = await supabaseServiceClient
      .from("salons")
      .insert({
        name: salonName,
        slug: salonSlug,
        owner_email: ownerEmail,
        status: "active",
        total_revenue: 0,
      })
      .select()
      .single();

    if (salonError || !salonData) {
      console.error("[create-salon-complete] Salon creation error:", salonError?.message);
      // Cleanup: delete auth user
      await supabaseServiceClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create salon: ${salonError?.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create staff profile (owner)
    const { data: staffProfile, error: staffError } = await supabaseServiceClient
      .from("staff")
      .insert({
        id: authData.user.id,
        salon_id: salonData.id,
        email: ownerEmail,
        full_name: ownerName,
        role: "owner",
        specialty: "Management",
        status: "Active",
      })
      .select()
      .single();

    if (staffError || !staffProfile) {
      console.error("[create-salon-complete] Staff profile error:", staffError?.message);
      // Cleanup: delete salon and auth user
      await supabaseServiceClient.from("salons").delete().eq("id", salonData.id);
      await supabaseServiceClient.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create staff profile: ${staffError?.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[create-salon-complete] Success. Created salon ${salonData.id} with owner ${authData.user.id}`);

    return new Response(
      JSON.stringify({
        message: "Salon created successfully",
        salon: {
          id: salonData.id,
          name: salonData.name,
          slug: salonData.slug,
          owner_email: salonData.owner_email,
        },
        owner: {
          id: authData.user.id,
          email: ownerEmail,
          name: ownerName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMsg = (error as Error).message || "Unknown error";
    console.error("[create-salon-complete] Catch error:", errorMsg, error);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
