import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import { fetchAll } from "../fetchers/index.js";
import { renderMarkdown } from "../renderers/markdown.js";
import { renderJson } from "../renderers/json.js";
import * as log from "../utils/logger.js";

export interface UpdateOptions {
  json?: boolean;
  quiet?: boolean;
}

export async function update(
  dir: string,
  options: UpdateOptions = {},
): Promise<void> {
  if (options.quiet) log.setQuiet(true);

  log.info("Loading config...");
  const config = await loadConfig(dir);

  const totalPackages =
    config.npm.length +
    config.pip.length +
    config.runtimes.length +
    config.docker.length +
    config.github.length +
    config.ai_models.length;

  log.info(`Fetching ${totalPackages} packages...`);

  const startTime = Date.now();
  const data = await fetchAll(config);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const outputFile = config.output.file;
  const content = options.json
    ? renderJson(data)
    : renderMarkdown(data);

  const outPath = join(dir, outputFile);
  await writeFile(outPath, content, "utf-8");

  log.success(`Written to ${outputFile} (${elapsed}s)`);

  // Count unknowns
  const unknowns = [
    ...data.npm.filter((p) => p.version === "unknown"),
    ...data.pip.filter((p) => p.version === "unknown"),
    ...data.runtimes.filter((p) => p.version === "unknown"),
    ...data.docker.filter((p) => p.tag === "unknown"),
    ...data.github.filter((p) => p.version === "unknown"),
  ];

  if (unknowns.length > 0) {
    log.warn(
      `${unknowns.length} package(s) could not be fetched: ${unknowns.map((u) => u.name).join(", ")}`,
    );
  }
}
