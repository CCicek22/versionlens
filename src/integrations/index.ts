import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { access } from "node:fs/promises";

const SNIPPET = `Before suggesting any package version, runtime version, or AI model ID,
read \`versions.md\` in this project root for the latest verified versions.
Do NOT hallucinate or guess version numbers. If a package is not listed,
check the registry directly.`;

const START_MARKER = "<!-- versionlens:start -->";
const END_MARKER = "<!-- versionlens:end -->";

const INTEGRATIONS: Record<
  string,
  { file: string; format: (snippet: string) => string }
> = {
  claude: {
    file: "CLAUDE.md",
    format: (s) =>
      `${START_MARKER}\n## Version Reference (versionlens)\n\n${s}\n${END_MARKER}`,
  },
  cursor: {
    file: ".cursorrules",
    format: (s) =>
      `${START_MARKER}\n# Version Reference (versionlens)\n\n${s}\n${END_MARKER}`,
  },
  copilot: {
    file: ".github/copilot-instructions.md",
    format: (s) =>
      `${START_MARKER}\n## Version Reference (versionlens)\n\n${s}\n${END_MARKER}`,
  },
  codex: {
    file: "AGENTS.md",
    format: (s) =>
      `${START_MARKER}\n## Version Reference (versionlens)\n\n${s}\n${END_MARKER}`,
  },
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function injectSnippet(
  dir: string,
  integration: string,
): Promise<string | null> {
  const config = INTEGRATIONS[integration.toLowerCase()];
  if (!config) return null;

  const filePath = join(dir, config.file);
  const block = config.format(SNIPPET);

  // Ensure parent directory exists for copilot
  if (config.file.includes("/")) {
    const { mkdir } = await import("node:fs/promises");
    const parentDir = join(dir, config.file.split("/").slice(0, -1).join("/"));
    await mkdir(parentDir, { recursive: true });
  }

  if (await fileExists(filePath)) {
    const content = await readFile(filePath, "utf-8");

    // Check if snippet already exists — replace it
    const startIdx = content.indexOf(START_MARKER);
    const endIdx = content.indexOf(END_MARKER);

    if (startIdx !== -1 && endIdx !== -1) {
      const updated =
        content.slice(0, startIdx) +
        block +
        content.slice(endIdx + END_MARKER.length);
      await writeFile(filePath, updated, "utf-8");
    } else {
      // Append
      const separator = content.endsWith("\n") ? "\n" : "\n\n";
      await writeFile(filePath, content + separator + block + "\n", "utf-8");
    }
  } else {
    // Create new file
    await writeFile(filePath, block + "\n", "utf-8");
  }

  return config.file;
}

export async function injectAll(
  dir: string,
  integrations: string[],
): Promise<string[]> {
  const results: string[] = [];
  for (const integration of integrations) {
    const file = await injectSnippet(dir, integration);
    if (file) results.push(file);
  }
  return results;
}

export function supportedIntegrations(): string[] {
  return Object.keys(INTEGRATIONS);
}
