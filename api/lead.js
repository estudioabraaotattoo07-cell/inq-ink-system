import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  "https://zkzsykmnhrkwmvgekshh.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprenN5a21uaHJrd212Z2Vrc2hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2MzE1NSwiZXhwIjoyMDk2NTM5MTU1fQ.H6ODQO_0jeuNWB0ep_GHaOatN5QpFLfRLOnZAzK2p84",
  { auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { nome, tel, email, idea, artista } = req.body;
  if (!nome) return res.status(400).json({ error: "nome obrigatório" });

  const row = {
    nome,
    tel: tel || "",
    email: email || "",
    insta: "",
    qual: "Q1",
    etapa: "lead",
    orig: "Site - Aura Chat",
    descricao: idea || "",
    artista: artista || null,
    estilo: "",
    regiao: "",
    tam: "Medio",
    intencao: "",
    cob: false,
    stars: 0,
    obs: "Lead captado via Aura Chat no site.",
    val_a: 0,
    val_c: 0,
    pgto: "",
    orcamento: false,
    contrato: false,
    faltas: 0,
    indicacoes: 0,
    credito: 0,
    cri: "",
    dias: 0,
  };

  row.user_id = "2d366d35-1cae-40d5-ba92-06fe2ab8a763";

  const { error } = await sb.from("clientes").insert(row);

  if (error) {
    console.error("Supabase insert error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
