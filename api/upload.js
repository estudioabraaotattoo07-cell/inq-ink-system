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

  const { base64, mimeType, clienteId, urlJaSalva } = req.body;

  // Caso especial: só vincular URL já existente a um cliente
  if (urlJaSalva && clienteId) {
    await sb.rpc("append_referencia", { cid: clienteId, url: urlJaSalva });
    return res.status(200).json({ ok: true, url: urlJaSalva });
  }

  if (!base64 || !mimeType) return res.status(400).json({ error: "base64 e mimeType obrigatórios" });

  const ext = mimeType.split("/")[1] || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(base64, "base64");

  const { error: upErr } = await sb.storage
    .from("referencias")
    .upload(fileName, buffer, { contentType: mimeType, upsert: false });

  if (upErr) {
    console.error("Storage upload error:", upErr);
    return res.status(500).json({ error: upErr.message });
  }

  const { data: pub } = sb.storage.from("referencias").getPublicUrl(fileName);
  const url = pub.publicUrl;

  // Se vier clienteId, anexa a URL na coluna referencias do cliente
  if (clienteId) {
    await sb.rpc("append_referencia", { cid: clienteId, url });
  }

  return res.status(200).json({ ok: true, url });
}
