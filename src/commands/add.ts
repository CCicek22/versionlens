import { loadConfig, saveConfig } from "../config/loader.js";
import * as log from "../utils/logger.js";

type Category = "npm" | "pip" | "runtimes" | "docker" | "github";

export async function add(
  dir: string,
  category: string,
  packages: string[],
): Promise<void> {
  const cat = category.toLowerCase() as Category;
  const validCategories: Category[] = ["npm", "pip", "runtimes", "docker", "github"];

  if (!validCategories.includes(cat)) {
    log.error(`Invalid category: ${category}. Use: ${validCategories.join(", ")}`);
    process.exit(1);
  }

  const config = await loadConfig(dir);
  const existing = new Set(config[cat]);
  let added = 0;

  for (const pkg of packages) {
    if (!existing.has(pkg)) {
      config[cat].push(pkg);
      added++;
    }
  }

  if (added === 0) {
    log.info("All packages already tracked.");
    return;
  }

  await saveConfig(dir, config);
  log.success(`Added ${added} package(s) to ${cat}.`);
}
