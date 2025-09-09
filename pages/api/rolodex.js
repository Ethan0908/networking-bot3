export default async function handler(req, res) {
  const { action } = req.query;
  const base = process.env.N8N_WEBHOOK_URL;
  if (!base) {
    res.status(500).json({ error: "Missing N8N_WEBHOOK_URL" });
    return;
  }
  if (!action) {
    res.status(400).json({ error: "Missing action" });
    return;
  }
  try {
    const response = await fetch(`${base}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy request failed" });
  }
}
