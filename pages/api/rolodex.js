export default async function handler(req, res) {
  const url = "http://35.196.73.136:5678/webhook/rolodex/save";
  try {
    const response = await fetch(url, {
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
