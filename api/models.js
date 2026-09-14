import {
  DEFAULT_MODEL, cors, options, requireKey, modelsUrl, googleFetch
} from "./_gemini.js";

export default async function handler(req, res) {
  if (options(res)) return;
  if (req.method !== "GET") {
    cors(res);
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  if (!requireKey(res)) return;

  try {
    const data = await googleFetch(modelsUrl(), { method: "GET" });

    const models = (data.models || [])
      .filter(m => {
        const methods = m.supportedGenerationMethods || m.supported_generation_methods || [];
        return !methods.length ||
          methods.includes("generateContent") ||
          methods.includes("generate_content");
      })
      .map(m => ({
        id: String(m.name || "").replace(/^models\//, ""),
        name: m.displayName || m.display_name || m.name,
        description: m.description || "",
        inputTokenLimit: m.inputTokenLimit || m.input_token_limit || null,
        outputTokenLimit: m.outputTokenLimit || m.output_token_limit || null
      }))
      .filter(m => m.id);

    cors(res);
    return res.status(200).json({
      success: true,
      defaultModel: DEFAULT_MODEL,
      models
    });
  } catch (error) {
    console.error("[models]", error);
    cors(res);
    return res.status(error.status >= 400 && error.status < 600 ? error.status : 500).json({
      success: false,
      error: error.message || "Unable to list models",
      fallback: [{ id: DEFAULT_MODEL, name: DEFAULT_MODEL }]
    });
  }
}
