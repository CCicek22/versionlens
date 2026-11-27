import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, saveConfig } from "../../src/config/loader.js";
import { ConfigSchema } from "../../src/config/schema.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "vlens-config-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("parses versionlens.yaml and applies schema defaults", async () => {
    await writeFile(
      join(dir, "versionlens.yaml"),
      "npm:\n  - commander\nruntimes:\n  - node\n",
      "utf-8",
    );

    const cfg = await loadConfig(dir);

    expect(cfg.npm).toEqual(["commander"]);
    expect(cfg.runtimes).toEqual(["node"]);
    expect(cfg.pip).toEqual([]);
    expect(cfg.output.file).toBe("versions.md");
  });

  it("throws when the file is missing", async () => {
    await expect(loadConfig(dir)).rejects.toThrow(/ENOENT/);
  });

  it("throws a schema error for an invalid config", async () => {
    await writeFile(join(dir, "versionlens.yaml"), "npm: not-a-list\n", "utf-8");

    await expect(loadConfig(dir)).rejects.toThrow();
  });
});

describe("saveConfig", () => {
  it("omits empty lists and default output from the written YAML", async () => {
    const cfg = ConfigSchema.parse({ npm: ["commander"] });

    await saveConfig(dir, cfg);
    const written = await readFile(join(dir, "versionlens.yaml"), "utf-8");

    expect(written).toContain("npm:");
    expect(written).not.toContain("pip:");
    expect(written).not.toContain("output:");
  });

  it("round-trips through loadConfig without losing entries", async () => {
    const cfg = ConfigSchema.parse({
      docker: ["postgres", "mcr.microsoft.com/dotnet/sdk"],
      github: ["acme/tool"],
      output: { file: "AGENTS.md", include_timestamp: false },
    });

    await saveConfig(dir, cfg);

    await expect(loadConfig(dir)).resolves.toEqual(cfg);
  });
});
