import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Não autenticado." }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await callerClient.auth.getUser();
    if (!user) {
      return json({ error: "Sessão inválida." }, 401);
    }

    const { nome, email, password, cargo, area } = await req.json();

    if (!nome?.trim() || !email?.trim() || !password) {
      return json({ error: "Nome, e-mail e senha são obrigatórios." });
    }
    if (password.length < 6) {
      return json({ error: "A senha precisa ter pelo menos 6 caracteres." });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    });

    if (createError) {
      return json({ error: createError.message });
    }

    const { data: existing } = await adminClient
      .from("equipe")
      .select("id")
      .ilike("nome", nome.trim())
      .is("email", null)
      .limit(1)
      .maybeSingle();

    const equipePayload = {
      nome: nome.trim(),
      email: email.trim(),
      cargo: cargo?.trim() || null,
      area: area || null,
    };

    const { error: equipeError } = existing
      ? await adminClient.from("equipe").update(equipePayload).eq("id", existing.id)
      : await adminClient.from("equipe").insert(equipePayload);

    if (equipeError) {
      return json({ error: equipeError.message });
    }

    return json({ ok: true, user_id: created.user.id });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Erro inesperado." }, 500);
  }
});
