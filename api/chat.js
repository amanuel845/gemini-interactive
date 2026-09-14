import {
  DEFAULT_MODEL, cors, options, requireKey,
  interactionsUrl, googleFetch, historyToInput, interactionText
} from "./_gemini.js";

export default async function handler(req, res) {
  if (options(res)) return;
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
      return res.status(400).json({
        success: false,
        error: "`prompt` (string) is required"
      });
    }

    const body = {
      model,
      input: historyToInput(history, prompt)
    };

    if (systemInstruction) body.system_instruction = systemInstruction;
    if (previousInteractionId) body.previous_interaction_id = previousInteractionId;

    const generationConfig = {};
    if (typeof temperature === "number") generationConfig.temperature = temperature;
    if (typeof maxOutputTokens === "number") generationConfig.max_output_tokens = maxOutputTokens;
    if (Object.keys(generationConfig).length) body.generation_config = generationConfig;

    const data = await googleFetch(interactionsUrl(), {
      method: "POST",
      body: JSON.stringify(body)
    });

    cors(res);
    return res.status(200).json({
      success: true,
      model,
      interactionId: data.id || data.interaction_id || null,
      text: interactionText(data),
      output: data.output || [],
      usage: data.usage || data.usage_metadata || null,
      raw: data
    });
  } catch (error) {
    console.error("[chat]", error);
    cors(res);
    return res.status(error.status >= 400 && error.status < 600 ? error.status : 500).json({
      success: false,
      error: error.message || "Internal server error",
      details: error.details || null
    });
  }
}
