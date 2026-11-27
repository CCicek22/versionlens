import { describe, expect, it } from "vitest";
import { ConfigSchema } from "../../src/config/schema.js";

describe("ConfigSchema", () => {
  it("fills every default for an empty object", () => {
    expect(ConfigSchema.parse({})).toEqual({
      npm: [],
      pip: [],
      runtimes: [],
      docker: [],
      github: [],
      ai_models: [],
      output: { file: "versions.md", include_timestamp: true },
      integrations: [],
    });
  });

  it("accepts a partial output block and fills the rest", () => {
    const cfg = ConfigSchema.parse({ output: { file: "AGENTS.md" } });

    expect(cfg.output).toEqual({ file: "AGENTS.md", include_timestamp: true });
  });

  it("rejects a list field that is not an array of strings", () => {
    expect(ConfigSchema.safeParse({ npm: "commander" }).success).toBe(false);
    expect(ConfigSchema.safeParse({ docker: [1, 2] }).success).toBe(false);
  });

  it("rejects a non-boolean include_timestamp", () => {
    expect(ConfigSchema.safeParse({ output: { include_timestamp: "yes" } }).success).toBe(false);
  });
});
