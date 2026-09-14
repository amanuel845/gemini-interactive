import {
  DEFAULT_MODEL, cors, options, requireKey,
  interactionsUrl, googleFetch, interactionText
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
      prompt = "Describe this image in detail.",
      imageBase64,
      mimeType = "image/jpeg",
      model = DEFAULT_MODEL,
      systemInstruction
    } = req.body || {};

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "`imageBase64` is required"
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

    // Interactions API accepts multimodal input items.
    const body = {
      model,
      input: [
        { type: "text", text: prompt },
        {
          type: "image",
          data: cleanBase64,
          mime_type: mimeType
        }
      ]
    };

    if (systemInstruction) body.system_instruction = systemInstruction;

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
    console.error("[vision]", error);
    cors(res);
    return res.status(error.status >= 400 && error.status < 600 ? error.status : 500).json({
      success: false,
      error: error.message || "Internal server error",
      details: error.details || null
    });
  }
}
