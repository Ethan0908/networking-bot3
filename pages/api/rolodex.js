export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = "http://10.0.0.157:5678/webhook/rolodex/save";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body ?? {}),
    });

    const status = response.status;
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    if (status === 204) {
      res.status(status).end();
      return;
    }

    if (contentType.includes("application/json")) {
      try {
        const data = text ? JSON.parse(text) : null;
        res.status(status).json(data);
        return;
      } catch (parseErr) {
        // Fall through to send the original body with the reported content type.
      }
    }

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    res.status(status).send(text);
  } catch (err) {
    res
      .status(502)
      .json({ error: "Proxy request failed", details: err?.message ?? "" });
  }
}
