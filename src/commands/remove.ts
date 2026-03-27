import { loadConfig, saveConfig } from "../config/loader.js";
import * as log from "../utils/logger.js";

type Category = "npm" | "pip" | "runtimes" | "docker" | "github";

export async function remove(
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
  const toRemove = new Set(packages);
  const before = config[cat].length;
  config[cat] = config[cat].filter((p) => !toRemove.has(p));
  const removed = before - config[cat].length;

  if (removed === 0) {
    log.info("No matching packages found.");
    return;
  }

  await saveConfig(dir, config);
  log.success(`Removed ${removed} package(s) from ${cat}.`);
}
