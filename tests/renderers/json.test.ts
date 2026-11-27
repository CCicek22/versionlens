import { describe, expect, it } from "vitest";
import type { FetchResult } from "../../src/fetchers/index.js";
import { renderJson } from "../../src/renderers/json.js";

describe("renderJson", () => {
  it("serialises the fetch result as 2-space indented JSON that round-trips", () => {
    const data: FetchResult = {
      timestamp: "2026-11-27T00:00:00.000Z",
      runtimes: [{ name: "Go", version: "1.27.4" }],
      npm: [{ name: "commander", version: "15.1.0" }],
      pip: [],
      docker: [],
      github: [],
      ai_models: [],
    };

    const out = renderJson(data);

    expect(out).toBe(JSON.stringify(data, null, 2));
    expect(JSON.parse(out)).toEqual(data);
  });
});
