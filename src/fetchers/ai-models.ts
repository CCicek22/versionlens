import { fetchJson } from "../utils/http.js";

export interface AiModelInfo {
  provider: string;
  models: { id: string; name: string; context: string }[];
}

const REGISTRY_URL =
  "https://raw.githubusercontent.com/CCicek22/versionlens-registry/main/ai-models.json";

/**
 * Curated model list — the ground truth when registry is unreachable.
 * Updated when providers announce new models.
 */
const CURATED_MODELS: Record<string, AiModelInfo> = {
  anthropic: {
    provider: "Anthropic",
    models: [
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", context: "1M" },
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", context: "200K" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", context: "200K" },
    ],
  },
  openai: {
    provider: "OpenAI",
    models: [
      { id: "gpt-5.4", name: "GPT-5.4", context: "128K" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", context: "128K" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", context: "128K" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", context: "128K" },
      { id: "o3", name: "o3", context: "200K" },
      { id: "o4-mini", name: "o4-mini", context: "200K" },
    ],
  },
  google: {
    provider: "Google",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview", context: "1M" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite Preview", context: "1M" },
      { id: "gemini-3.1-flash-live-preview", name: "Gemini 3.1 Flash Live Preview", context: "128K" },
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview", context: "1M" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview", context: "1M" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", context: "1M" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", context: "1M" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", context: "1M" },
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", context: "1M" },
    ],
  },
  xai: {
    provider: "xAI",
    models: [
      { id: "grok-4.20-0309-reasoning", name: "Grok 4.20 Reasoning", context: "?" },
      { id: "grok-4.20-0309-non-reasoning", name: "Grok 4.20 Non-Reasoning", context: "?" },
      { id: "grok-4.20-multi-agent-0309", name: "Grok 4.20 Multi-Agent", context: "?" },
      { id: "grok-4-fast-reasoning", name: "Grok 4 Fast Reasoning", context: "?" },
      { id: "grok-4-fast-non-reasoning", name: "Grok 4 Fast Non-Reasoning", context: "?" },
      { id: "grok-4-0709", name: "Grok 4 (0709)", context: "?" },
      { id: "grok-code-fast-1", name: "Grok Code Fast", context: "?" },
      { id: "grok-3", name: "Grok 3", context: "?" },
    ],
  },
  meta: {
    provider: "Meta",
    models: [
      { id: "llama-4-maverick-17b-128e", name: "Llama 4 Maverick", context: "1M" },
      { id: "llama-4-scout-17b-16e", name: "Llama 4 Scout", context: "512K" },
    ],
  },
};

/**
 * Fetch AI model lists. Strategy:
 * 1. Try pulling from versionlens-registry (always up to date, no keys)
 * 2. Fall back to curated list baked into the CLI
 *
 * No API keys needed.
 */
export async function fetchAiModels(
  providers: string[],
): Promise<AiModelInfo[]> {
  // Try registry first
  let registry: Record<string, AiModelInfo> | null = null;
  try {
    registry = await fetchJson<Record<string, AiModelInfo>>(REGISTRY_URL);
  } catch {
    // Registry unreachable — use curated list
  }

  return providers.map((p) => {
    const key = p.toLowerCase();
    // Registry takes priority, then curated fallback
    const info = registry?.[key] ?? CURATED_MODELS[key];
    if (!info) {
      return {
        provider: p,
        models: [{ id: "unknown", name: "Unsupported provider", context: "" }],
      };
    }
    return info;
  });
}
