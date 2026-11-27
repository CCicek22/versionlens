/**
 * Keep-last-known-value fallback for registry regeneration.
 *
 * A failed fetch yields version "unknown". Instead of writing that over a
 * good value already in registry/*.md, the item keeps the cells of its
 * previous row. Only an item with no previous value stays "unknown".
 */

import { readFile } from "node:fs/promises";

const SEPARATOR = /^\|[\s|:-]+\|$/;

// Map first-column name -> cells of that row (cells[0] is the name).
export function parseRegistryRows(md) {
  const rows = new Map();
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|") || SEPARATOR.test(line)) continue;
    if (lines[i + 1] && SEPARATOR.test(lines[i + 1])) continue; // header row
    const cells = line.slice(1, -1).split("|").map((c) => c.trim());
    rows.set(cells[0], cells);
  }
  return rows;
}

export async function readRegistryRows(path) {
  try {
    return parseRegistryRows(await readFile(path, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return new Map();
    throw err;
  }
}

// columns: { field: cellIndex }, must include `version`.
// Mutates failed items in place; returns [{ name, kept }] for every failed item.
export function keepLastKnown(items, previous, columns) {
  const failed = [];
  for (const item of items) {
    if (item.version !== "unknown") continue;
    const cells = previous.get(item.name);
    const kept = cells !== undefined && cells[columns.version] !== "unknown";
    if (kept) {
      for (const [field, col] of Object.entries(columns)) {
        item[field] = cells[col] ?? item[field];
      }
    }
    failed.push({ name: item.name, kept });
  }
  return failed;
}
