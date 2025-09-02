// Serverless function that calls OpenAI safely (your API key stays on the server)
// File: netlify/functions/chat.js
// Requires Node 18+ (Netlify Functions default)

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }) };
  }

  let messages = [];
  try {
    const payload = JSON.parse(event.body || "{}");
    messages = Array.isArray(payload.messages)
      ? payload.messages
      : [{ role: "user", content: String(payload.message ?? "") }];
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Bad JSON body" }) };
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages,
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = data?.error?.message || "Upstream error";
      return { statusCode: 502, headers, body: JSON.stringify({ error: msg }) };
    }

    const reply = data?.choices?.[0]?.message?.content || "Sorry, I couldn’t generate a reply.";
    return { statusCode: 200, headers, body: JSON.stringify({ reply }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Server error: " + err.message }) };
  }
};
