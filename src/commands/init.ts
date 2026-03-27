import { access } from "node:fs/promises";
import { join } from "node:path";
import inquirer from "inquirer";
import { saveConfig } from "../config/loader.js";
import type { Config } from "../config/schema.js";
import { detectPackages } from "../utils/detect.js";
import { injectAll, supportedIntegrations } from "../integrations/index.js";
import { update } from "./update.js";
import * as log from "../utils/logger.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function init(dir: string): Promise<void> {
  console.log("");
  console.log("  versionlens — Keep your AI coding agent up to date");
  console.log("");

  // Check if config already exists
  if (await fileExists(join(dir, "versionlens.yaml"))) {
    const { overwrite } = await inquirer.prompt([
      {
        type: "confirm",
        name: "overwrite",
        message: "versionlens.yaml already exists. Overwrite?",
        default: false,
      },
    ]);
    if (!overwrite) {
      log.info("Aborted.");
      return;
    }
  }

  // Detect existing packages
  const detected = await detectPackages(dir);

  // Package managers
  const { managers } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "managers",
      message: "What package managers do you use?",
      choices: [
        { name: "npm", checked: detected.npm.length > 0 },
        { name: "pip", checked: detected.pip.length > 0 },
      ],
    },
  ]);

  let npmPackages: string[] = [];
  let pipPackages: string[] = [];

  // Auto-detect npm
  if (managers.includes("npm") && detected.npm.length > 0) {
    const { useDetected } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useDetected",
        message: `Found ${detected.npm.length} npm packages in package.json. Track all?`,
        default: true,
      },
    ]);

    if (useDetected) {
      npmPackages = detected.npm;
    } else {
      const { selected } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selected",
          message: "Select npm packages to track:",
          choices: detected.npm.map((p) => ({ name: p, checked: true })),
        },
      ]);
      npmPackages = selected;
    }
  }

  // Auto-detect pip
  if (managers.includes("pip") && detected.pip.length > 0) {
    const { useDetected } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useDetected",
        message: `Found ${detected.pip.length} pip packages. Track all?`,
        default: true,
      },
    ]);

    if (useDetected) {
      pipPackages = detected.pip;
    } else {
      const { selected } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selected",
          message: "Select pip packages to track:",
          choices: detected.pip.map((p) => ({ name: p, checked: true })),
        },
      ]);
      pipPackages = selected;
    }
  }

  // Runtimes
  const { runtimes } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "runtimes",
      message: "Track runtime versions?",
      choices: [
        { name: "node", checked: true },
        { name: "python", checked: managers.includes("pip") },
        { name: "bun", checked: false },
        { name: "java", checked: false },
        { name: "go", checked: false },
        { name: "deno", checked: false },
      ],
    },
  ]);

  // Docker
  let dockerImages: string[] = [];
  const { trackDocker } = await inquirer.prompt([
    {
      type: "confirm",
      name: "trackDocker",
      message: "Track Docker image versions?",
      default: detected.docker.length > 0,
    },
  ]);

  if (trackDocker) {
    if (detected.docker.length > 0) {
      log.info(`Found Docker images: ${detected.docker.join(", ")}`);
    }

    const defaultImages = detected.docker.length > 0 ? detected.docker : [];
    const { images } = await inquirer.prompt([
      {
        type: "input",
        name: "images",
        message: "Docker images to track (comma-separated):",
        default: defaultImages.join(", ") || "node, python, postgres, redis, nginx",
      },
    ]);
    dockerImages = images
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  // AI tool integrations
  const { integrations } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "integrations",
      message: "Which AI tools do you use?",
      choices: supportedIntegrations().map((i) => ({
        name:
          i === "claude"
            ? "Claude Code (CLAUDE.md)"
            : i === "cursor"
              ? "Cursor (.cursorrules)"
              : i === "copilot"
                ? "GitHub Copilot (.github/copilot-instructions.md)"
                : "OpenAI Codex (AGENTS.md)",
        value: i,
        checked: i === "claude",
      })),
    },
  ]);

  // Build config
  const config: Config = {
    npm: npmPackages,
    pip: pipPackages,
    runtimes,
    docker: dockerImages,
    github: [],
    ai_models: [],
    output: { file: "versions.md", include_timestamp: true },
    integrations,
  };

  // Save config
  await saveConfig(dir, config);
  log.success("Created versionlens.yaml");

  // Fetch versions
  await update(dir);

  // Inject integration snippets
  if (integrations.length > 0) {
    const files = await injectAll(dir, integrations);
    for (const file of files) {
      log.success(`Updated ${file} with version reference rule`);
    }
  }

  console.log("");
  log.success("Done! Run `versionlens update` anytime to refresh.");
  log.dim("  Tip: add to cron or CI for automatic updates.");
  console.log("");
}
