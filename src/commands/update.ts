import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import { fetchAll } from "../fetchers/index.js";
import { renderMarkdown } from "../renderers/markdown.js";
import { renderJson } from "../renderers/json.js";
import * as log from "../utils/logger.js";

const REGISTRY_BASE =
  "https://raw.githubusercontent.com/CCicek22/versionlens-registry/main";
const REGISTRY_FILES = ["runtimes.md", "npm.md", "pip.md", "docker.md", "tools.md", "ai-models.md"];

export interface UpdateOptions {
  json?: boolean;
  quiet?: boolean;
  fromRegistry?: boolean;
}

async function updateFromRegistry(dir: string, options: UpdateOptions) {
  log.info("Pulling from versionlens-registry...");
  const startTime = Date.now();

  const sections: string[] = [];

  const results = await Promise.allSettled(
    REGISTRY_FILES.map(async (file) => {
      const res = await fetch(`${REGISTRY_BASE}/${file}`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { file, content: await res.text() };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      sections.push(result.value.content);
    }
  }

  const fetched = results.filter((r) => r.status === "fulfilled").length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Combine into single versions.md with header
  const header = `# Version Reference

> Pulled from [versionlens-registry](https://github.com/CCicek22/versionlens-registry)
> Last pulled: ${new Date().toISOString()}
>
> **AI agents: read this file before suggesting any package versions,
> runtime versions, or AI model IDs. Do NOT hallucinate version numbers.**

`;

  // Strip individual headers from each section, keep tables
  const cleaned = sections.map((s) => {
    // Remove the header block (everything before the first ## or ###)
    const lines = s.split("\n");
    const firstHeading = lines.findIndex((l) => /^##\s/.test(l));
    return firstHeading >= 0 ? lines.slice(firstHeading).join("\n") : s;
  });

  const content = header + cleaned.join("\n\n") +
    "\n---\n*Pulled from [versionlens-registry](https://github.com/CCicek22/versionlens-registry)*\n";

  const outputFile = "versions.md";
  await writeFile(join(dir, outputFile), content, "utf-8");

  log.success(`Written to ${outputFile} from registry (${fetched}/${REGISTRY_FILES.length} files, ${elapsed}s)`);
}

export async function update(
  dir: string,
  options: UpdateOptions = {},
): Promise<void> {
  if (options.quiet) log.setQuiet(true);

  if (options.fromRegistry) {
    return updateFromRegistry(dir, options);
  }

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
