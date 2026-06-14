export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { apiKey, from, to, text } = req.body;

  if (!apiKey || !from || !to || !text) {
    return res.status(400).json({ error: "Campos obrigatórios: apiKey, from, to, text" });
  }

  try {
    const response = await fetch("https://api.zenvia.com/v2/channels/sms/messages", {
      method: "POST",
      headers: {
        "X-API-TOKEN": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: from,
        to: to,
        contents: [{ type: "text", text: text }]
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Erro interno", detail: err.message });
  }
}
