const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_MODEL = "gemini-3.6-flash";

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function options(res) {
  cors(res);
  if (res.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function requireKey(res) {
  if (!API_KEY) {
    res.status(500).json({
      success: false,
      error: "GEMINI_API_KEY is not configured on Vercel."
    });
    return false;
  }
  return true;
}

export function interactionsUrl() {
  return `${BASE_URL}/interactions?key=${encodeURIComponent(API_KEY)}`;
}

export function modelsUrl() {
  return `${BASE_URL}/models?key=${encodeURIComponent(API_KEY)}`;
}

export async function googleFetch(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      data?.raw ||
      `Google API returned HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

export function historyToInput(history = [], prompt = "") {
  const items = [];

  for (const h of Array.isArray(history) ? history.slice(-20) : []) {
    if (!h || typeof h.text !== "string" || !h.text.trim()) continue;
    items.push({
      type: h.role === "assistant" ? "text" : "text",
      text: `${h.role === "assistant" ? "Assistant" : "User"}: ${h.text}`
    });
  }

  if (prompt) {
    items.push({ type: "text", text: `User: ${prompt}` });
  }

  return items;
}

export function interactionText(data) {
  if (typeof data?.text === "string") return data.text;

  const output = data?.output;
  if (!Array.isArray(output)) return "";

  return output.map(item => {
    if (typeof item?.text === "string") return item.text;
    if (Array.isArray(item?.content)) {
      return item.content.map(x => x?.text || "").join("");
    }
    return "";
  }).join("");
}
