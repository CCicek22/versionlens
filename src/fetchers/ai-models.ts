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
      { id: "gpt-5.4", name: "GPT-5.4", context: "1M" },
      { id: "gpt-5.4-pro", name: "GPT-5.4 Pro", context: "1M" },
      { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", context: "400K" },
      { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", context: "400K" },
      { id: "o3", name: "o3 (Reasoning)", context: "200K" },
      { id: "o3-pro", name: "o3 Pro (Reasoning)", context: "200K" },
      { id: "o4-mini", name: "o4-mini (Reasoning)", context: "200K" },
      { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", context: "200K" },
      { id: "gpt-image-1.5", name: "GPT Image 1.5", context: "-" },
    ],
  },
  google: {
    provider: "Google Gemini",
    models: [
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro", context: "1M" },
      { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash Lite", context: "1M" },
      { id: "gemini-3.1-flash-live-preview", name: "Gemini 3.1 Flash Live", context: "128K" },
      { id: "gemini-3.1-flash-image-preview", name: "Gemini 3.1 Flash Image", context: "64K" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Stable)", context: "1M" },
      { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Stable)", context: "1M" },
      { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite (Stable)", context: "1M" },
    ],
  },
  xai: {
    provider: "xAI (Grok)",
    models: [
      { id: "grok-4.20-0309-reasoning", name: "Grok 4.20 Reasoning", context: "2M" },
      { id: "grok-4.20-0309-non-reasoning", name: "Grok 4.20 Non-Reasoning", context: "2M" },
      { id: "grok-4.20-multi-agent-0309", name: "Grok 4.20 Multi-Agent", context: "2M" },
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", context: "2M" },
      { id: "grok-4-1-fast-non-reasoning", name: "Grok 4.1 Fast Non-Reasoning", context: "2M" },
      { id: "grok-code-fast-1", name: "Grok Code Fast", context: "256K" },
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
