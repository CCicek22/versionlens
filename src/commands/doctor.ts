import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../config/loader.js";
import * as log from "../utils/logger.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function doctor(dir: string): Promise<void> {
  let issues = 0;

  // Check config
  try {
    const config = await loadConfig(dir);
    log.success("Config: versionlens.yaml is valid");

    const total =
      config.npm.length +
      config.pip.length +
      config.runtimes.length +
      config.docker.length +
      config.github.length +
      config.ai_models.length;

    if (total === 0) {
      log.warn("Config: no packages configured — nothing to track");
      issues++;
    } else {
      log.success(`Config: ${total} packages configured`);
    }

    // Check output file
    const outputPath = join(dir, config.output.file);
    if (await fileExists(outputPath)) {
      const content = await readFile(outputPath, "utf-8");
      const lines = content.split("\n").length;
      log.success(`Output: ${config.output.file} exists (${lines} lines)`);
    } else {
      log.warn(`Output: ${config.output.file} not found — run \`versionlens update\``);
      issues++;
    }

    // Check integrations
    for (const integration of config.integrations) {
      const files: Record<string, string> = {
        claude: "CLAUDE.md",
        cursor: ".cursorrules",
        copilot: ".github/copilot-instructions.md",
        codex: "AGENTS.md",
      };
      const file = files[integration];
      if (file) {
        const path = join(dir, file);
        if (await fileExists(path)) {
          const content = await readFile(path, "utf-8");
          if (content.includes("versionlens:start")) {
            log.success(`Integration: ${file} has versionlens snippet`);
          } else {
            log.warn(`Integration: ${file} exists but missing versionlens snippet — run \`versionlens integrate\``);
            issues++;
          }
        } else {
          log.warn(`Integration: ${file} not found — run \`versionlens integrate\``);
          issues++;
        }
      }
    }

    // Check connectivity
    try {
      const res = await fetch("https://registry.npmjs.org/react/latest", {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        log.success("Network: npm registry reachable");
      } else {
        log.warn("Network: npm registry returned non-200");
        issues++;
      }
    } catch {
      log.warn("Network: cannot reach npm registry");
      issues++;
    }

    // Check GitHub token
    if (config.github.length > 0 && !process.env.GITHUB_TOKEN) {
      log.warn("Auth: GITHUB_TOKEN not set — GitHub API limited to 60 req/hr");
      issues++;
    }

    // Check AI model keys
    const keyMap: Record<string, string> = {
      anthropic: "ANTHROPIC_API_KEY",
      openai: "OPENAI_API_KEY",
      google: "GOOGLE_API_KEY",
      xai: "XAI_API_KEY",
    };
    for (const provider of config.ai_models) {
      const envVar = keyMap[provider.toLowerCase()];
      if (envVar && !process.env[envVar]) {
        log.warn(`Auth: ${envVar} not set — ${provider} models won't be tracked`);
        issues++;
      }
    }
  } catch (err) {
    log.error(`Config: ${err instanceof Error ? err.message : "invalid config"}`);
    issues++;
  }

  console.log("");
  if (issues === 0) {
    log.success("All checks passed!");
  } else {
    log.warn(`${issues} issue(s) found.`);
  }
}
