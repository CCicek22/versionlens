import { Command } from "commander";
import { init } from "./commands/init.js";
import { update } from "./commands/update.js";
import { add } from "./commands/add.js";
import { remove } from "./commands/remove.js";
import { list } from "./commands/list.js";
import { integrate } from "./commands/integrate.js";
import { doctor } from "./commands/doctor.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("versionlens")
    .description(
      "Stop AI coding agents from hallucinating package versions.",
    )
    .version("1.0.0");

  program
    .command("init")
    .description("Interactive setup — creates config + versions.md")
    .action(async () => {
      await init(process.cwd());
    });

  program
    .command("update")
    .description("Fetch latest versions and write versions.md")
    .option("--json", "Output as JSON instead of markdown")
    .option("-q, --quiet", "Suppress output except errors")
    .action(async (options) => {
      await update(process.cwd(), options);
    });

  program
    .command("add <category> <packages...>")
    .description(
      "Add packages to track (categories: npm, pip, runtimes, docker, github)",
    )
    .action(async (category: string, packages: string[]) => {
      await add(process.cwd(), category, packages);
    });

  program
    .command("remove <category> <packages...>")
    .description("Remove packages from tracking")
    .action(async (category: string, packages: string[]) => {
      await remove(process.cwd(), category, packages);
    });

  program
    .command("list")
    .description("Show all tracked packages")
    .action(async () => {
      await list(process.cwd());
    });

  program
    .command("integrate")
    .description(
      "Re-generate AI tool instruction snippets (CLAUDE.md, .cursorrules, etc.)",
    )
    .action(async () => {
      await integrate(process.cwd());
    });

  program
    .command("doctor")
    .description("Verify config, connectivity, and output")
    .action(async () => {
      await doctor(process.cwd());
    });

  return program;
}
