import {
  DEFAULT_MODEL, cors, options, requireKey,
  interactionsUrl, historyToInput
} from "./_gemini.js";

function extractText(event) {
  const candidates = [
    event?.delta,
    event?.text,
    event?.content?.text,
    event?.item?.text,
    event?.output?.text
  ];
  return candidates.find(v => typeof v === "string") || "";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    cors(res);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  if (!requireKey(res)) return;

  try {
    const {
      prompt,
      model = DEFAULT_MODEL,
      systemInstruction,
      history = [],
      temperature,
      maxOutputTokens,
      previousInteractionId
    } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      cors(res);
      return res.status(400).json({ success: false, error: "`prompt` (string) is required" });
    }

    const body = {
      model,
      input: historyToInput(history, prompt),
      stream: true
    };

    if (systemInstruction) body.system_instruction = systemInstruction;
    if (previousInteractionId) body.previous_interaction_id = previousInteractionId;

    const generationConfig = {};
    if (typeof temperature === "number") generationConfig.temperature = temperature;
    if (typeof maxOutputTokens === "number") generationConfig.max_output_tokens = maxOutputTokens;
    if (Object.keys(generationConfig).length) body.generation_config = generationConfig;

    const upstream = await fetch(interactionsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "text/event-stream" },
      body: JSON.stringify(body)
    });

    if (!upstream.ok) {
      const raw = await upstream.text();
      let message = raw;
      try {
        const parsed = JSON.parse(raw);
        message = parsed?.error?.message || parsed?.message || raw;
      } catch {}
      const err = new Error(message);
      err.status = upstream.status;
      throw err;
    }

    cors(res);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const block of parts) {
        const dataLines = block
          .split(/\r?\n/)
          .filter(line => line.startsWith("data:"))
          .map(line => line.slice(5).trim());

        if (!dataLines.length) continue;

        const payload = dataLines.join("\n");
        if (payload === "[DONE]") continue;

        try {
          const event = JSON.parse(payload);
          const text = extractText(event);
          if (text) res.write(text);
        } catch {
          // Ignore non-JSON SSE comments/keepalives.
        }
      }
    }

    if (buffer.trim()) {
      for (const line of buffer.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        try {
          const event = JSON.parse(payload);
          const text = extractText(event);
          if (text) res.write(text);
        } catch {}
      }
    }

    res.end();
  } catch (error) {
    console.error("[stream]", error);
    if (!res.headersSent) {
      cors(res);
      return res.status(error.status >= 400 && error.status < 600 ? error.status : 500)
        .json({ success: false, error: error.message || "Internal server error" });
    }
    res.write(`\n[ERROR] ${error.message || "Streaming error"}`);
    res.end();
  }
}
