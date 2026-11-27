import { describe, expect, it } from "vitest";
import { fetchAiModels } from "../../src/fetchers/ai-models.js";

describe("fetchAiModels", () => {
  it("returns the curated model list for a known provider, case-insensitively", async () => {
    const [anthropic] = await fetchAiModels(["Anthropic"]);

    expect(anthropic?.provider).toBe("Anthropic");
    expect(anthropic?.models.length).toBeGreaterThan(0);
    for (const model of anthropic?.models ?? []) {
      expect(model.id).toMatch(/^[a-z0-9][a-z0-9.\-]*$/);
    }
  });

  it("returns a placeholder entry for an unknown provider", async () => {
    const [result] = await fetchAiModels(["nobody"]);

    expect(result).toEqual({
      provider: "nobody",
      models: [{ id: "unknown", name: "Unsupported provider", context: "" }],
    });
  });
});
