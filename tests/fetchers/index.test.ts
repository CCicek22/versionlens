import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigSchema } from "../../src/config/schema.js";
import { fetchAll } from "../../src/fetchers/index.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchAll", () => {
  it("fetches only the categories that have entries", async () => {
    const calls = mockFetch({
      "https://registry.npmjs.org/commander/latest": { body: fixture("npm-commander-latest.json") },
    });
    const config = ConfigSchema.parse({ npm: ["commander"] });

    const result = await fetchAll(config);

    expect(calls.map((c) => c.url)).toEqual(["https://registry.npmjs.org/commander/latest"]);
    expect(result.npm).toEqual([{ name: "commander", version: "15.1.0" }]);
    expect(result.pip).toEqual([]);
    expect(result.docker).toEqual([]);
    expect(result.github).toEqual([]);
    expect(result.runtimes).toEqual([]);
    expect(result.ai_models).toEqual([]);
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
