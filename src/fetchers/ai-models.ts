export interface AiModelInfo {
  provider: string;
  models: { id: string; name: string; context: string }[];
}

// No registry JSON — CLI uses baked-in curated list as fallback.
// For full registry data, use `versionlens update --from-registry`.

/**
 * Curated model list — only latest version per family.
 * Updated when providers announce new models.
 */
// Closed models: latest per family, from the official pages in
// registry/ai-models.md (verified 2026-11-27). Keep in sync with scripts/update.mjs.
const CURATED_MODELS: Record<string, AiModelInfo> = {
  anthropic: {
    provider: "Anthropic",
    models: [
      { id: "claude-fable-5-2", name: "Claude Fable 5.2", context: "1M" },
      { id: "claude-opus-5-5", name: "Claude Opus 5.5", context: "1M" },
      { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", context: "1M" },
      { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", context: "1M" },
    ],
  },
  openai: {
    provider: "OpenAI",
    models: [
      { id: "gpt-6.2-astra", name: "GPT-6.2 Astra", context: "1.05M" },
      { id: "gpt-6.2-sol", name: "GPT-6.2 Sol", context: "1.05M" },
      { id: "gpt-6.1-terra", name: "GPT-6.1 Terra", context: "1.05M" },
      { id: "gpt-6-luna", name: "GPT-6 Luna", context: "1.05M" },
    ],
  },
  google: {
    provider: "Google Gemini",
    models: [
      { id: "gemini-4-carbon", name: "Gemini 4 Carbon", context: "1M" },
      { id: "gemini-4-neon", name: "Gemini 4 Neon", context: "1M" },
      { id: "gemini-4-hydrogen", name: "Gemini 4 Hydrogen", context: "1M" },
      { id: "gemini-4-argon", name: "Gemini 4 Argon", context: "1M" },
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", context: "-" },
      { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", context: "-" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash-Lite", context: "-" },
      { id: "gemini-3.8-live", name: "Gemini 3.8 Live", context: "-" },
      { id: "gemini-3.1-flash-image", name: "Nano Banana 2", context: "-" },
    ],
  },
  xai: {
    provider: "xAI (Grok)",
    models: [
      { id: "grok-4.7", name: "Grok 4.7", context: "500K" },
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
 * No API keys needed. Uses curated list.
 * For full data (HuggingFace open models), use --from-registry.
 */
export async function fetchAiModels(
  providers: string[],
): Promise<AiModelInfo[]> {
  return providers.map((p) => {
    const key = p.toLowerCase();
    const info = CURATED_MODELS[key];
    if (!info) {
      return {
        provider: p,
        models: [{ id: "unknown", name: "Unsupported provider", context: "" }],
      };
    }
    return info;
  });
}
