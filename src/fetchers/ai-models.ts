export interface AiModelInfo {
  provider: string;
  models: string[];
}

interface ModelEntry {
  id: string;
}

interface ModelsResponse {
  data: ModelEntry[];
}

interface GoogleModel {
  name: string;
}

interface GoogleModelsResponse {
  models: GoogleModel[];
}

const PROVIDER_FETCHERS: Record<
  string,
  () => Promise<AiModelInfo>
> = {
  anthropic: async () => {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { provider: "Anthropic", models: ["Set ANTHROPIC_API_KEY to track"] };

    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    const data = (await res.json()) as ModelsResponse;
    const models = data.data
      ?.map((m) => m.id)
      .sort()
      .reverse()
      .slice(0, 10) ?? [];
    return { provider: "Anthropic", models };
  },

  openai: async () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { provider: "OpenAI", models: ["Set OPENAI_API_KEY to track"] };

    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = (await res.json()) as ModelsResponse;
    const models = data.data
      ?.map((m) => m.id)
      .filter((id) => id.startsWith("gpt-"))
      .sort()
      .reverse()
      .slice(0, 10) ?? [];
    return { provider: "OpenAI", models };
  },

  google: async () => {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) return { provider: "Google", models: ["Set GOOGLE_API_KEY to track"] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    );
    const data = (await res.json()) as GoogleModelsResponse;
    const models = data.models
      ?.map((m) => m.name.replace("models/", ""))
      .filter((id) => id.startsWith("gemini-"))
      .sort()
      .reverse()
      .slice(0, 10) ?? [];
    return { provider: "Google", models };
  },

  xai: async () => {
    const key = process.env.XAI_API_KEY;
    if (!key) return { provider: "xAI", models: ["Set XAI_API_KEY to track"] };

    const res = await fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = (await res.json()) as ModelsResponse;
    const models = data.data
      ?.map((m) => m.id)
      .sort()
      .reverse()
      .slice(0, 10) ?? [];
    return { provider: "xAI", models };
  },
};

export async function fetchAiModels(
  providers: string[],
): Promise<AiModelInfo[]> {
  const results = await Promise.allSettled(
    providers.map(async (p) => {
      const fetcher = PROVIDER_FETCHERS[p.toLowerCase()];
      if (!fetcher) {
        return { provider: p, models: ["unsupported provider"] };
      }
      try {
        return await fetcher();
      } catch {
        return { provider: p, models: ["fetch failed"] };
      }
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { provider: providers[i], models: ["fetch failed"] },
  );
}
