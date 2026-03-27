import { loadConfig } from "../config/loader.js";
import { injectAll } from "../integrations/index.js";
import * as log from "../utils/logger.js";

export async function integrate(dir: string): Promise<void> {
  const config = await loadConfig(dir);

  if (config.integrations.length === 0) {
    log.warn("No integrations configured in versionlens.yaml.");
    log.info("Add integrations: [claude, cursor, copilot, codex]");
    return;
  }

  const files = await injectAll(dir, config.integrations);
  for (const file of files) {
    log.success(`Updated ${file}`);
  }
}
