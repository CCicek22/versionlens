import chalk from "chalk";

let quiet = false;

export function setQuiet(value: boolean) {
  quiet = value;
}

export function info(msg: string) {
  if (!quiet) console.log(chalk.blue("ℹ"), msg);
}

export function success(msg: string) {
  if (!quiet) console.log(chalk.green("✓"), msg);
}

export function warn(msg: string) {
  if (!quiet) console.log(chalk.yellow("⚠"), msg);
}

export function error(msg: string) {
  console.error(chalk.red("✗"), msg);
}

export function dim(msg: string) {
  if (!quiet) console.log(chalk.dim(msg));
}
