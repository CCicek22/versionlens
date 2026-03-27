import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";
import { ConfigSchema, type Config } from "./schema.js";

const CONFIG_FILE = "versionlens.yaml";

export async function loadConfig(dir: string): Promise<Config> {
  const path = join(dir, CONFIG_FILE);
  const raw = await readFile(path, "utf-8");
  const parsed = parse(raw);
  return ConfigSchema.parse(parsed);
}

export async function saveConfig(dir: string, config: Config): Promise<void> {
  const path = join(dir, CONFIG_FILE);

  // Strip empty arrays and defaults for cleaner output
  const clean: Record<string, unknown> = {};
  if (config.npm.length) clean.npm = config.npm;
  if (config.pip.length) clean.pip = config.pip;
  if (config.runtimes.length) clean.runtimes = config.runtimes;
  if (config.docker.length) clean.docker = config.docker;
  if (config.github.length) clean.github = config.github;
  if (config.ai_models.length) clean.ai_models = config.ai_models;
  if (config.output.file !== "versions.md" || !config.output.include_timestamp) {
    clean.output = config.output;
  }
  if (config.integrations.length) clean.integrations = config.integrations;

  const content = stringify(clean, { lineWidth: 0 });
  await writeFile(path, content, "utf-8");
}

export function configExists(dir: string): string {
  return join(dir, CONFIG_FILE);
}
