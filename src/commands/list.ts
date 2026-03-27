import chalk from "chalk";
import { loadConfig } from "../config/loader.js";

export async function list(dir: string): Promise<void> {
  const config = await loadConfig(dir);

  const sections: [string, string[]][] = [
    ["Runtimes", config.runtimes],
    ["npm", config.npm],
    ["pip", config.pip],
    ["Docker", config.docker],
    ["GitHub", config.github],
    ["AI Models", config.ai_models],
  ];

  let total = 0;

  for (const [label, items] of sections) {
    if (items.length === 0) continue;
    console.log(chalk.bold(`\n${label} (${items.length}):`));
    for (const item of items) {
      console.log(`  ${item}`);
    }
    total += items.length;
  }

  console.log(chalk.dim(`\nTotal: ${total} tracked`));
  console.log(chalk.dim(`Output: ${config.output.file}`));
  if (config.integrations.length) {
    console.log(chalk.dim(`Integrations: ${config.integrations.join(", ")}`));
  }
}
