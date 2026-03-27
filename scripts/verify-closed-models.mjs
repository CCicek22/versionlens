/**
 * Verify closed API model lists using local API keys.
 * Run this locally (not in CI) — it reads XAI_API_KEY and GOOGLE_API_KEY
 * from your environment.
 *
 * Usage: node scripts/verify-closed-models.mjs
 *
 * If new models are found, it updates ai-models.json and ai-models.md.
 * Then you can commit + push to update the registry.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "registry");

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// ─── Provider fetchers ──────────────────────────────────────────────

async function fetchGeminiModels() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) { console.log("  GOOGLE_API_KEY not set, skipping Gemini"); return null; }

  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
  );

  const models = data.models
    ?.filter((m) => m.name.includes("gemini"))
    .map((m) => ({
      id: m.name.replace("models/", ""),
      name: m.displayName || m.name.replace("models/", ""),
      context: m.inputTokenLimit ? `${Math.round(m.inputTokenLimit / 1000)}K` : "?",
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .reverse()
    .slice(0, 10) ?? [];

  return { provider: "Google Gemini (Closed API)", models };
}

async function fetchXaiModels() {
  const key = process.env.XAI_API_KEY;
  if (!key) { console.log("  XAI_API_KEY not set, skipping xAI"); return null; }

  const data = await fetchJson("https://api.x.ai/v1/models", {
    Authorization: `Bearer ${key}`,
  });

  const models = data.data
    ?.map((m) => ({
      id: m.id,
      name: m.id,
      context: "?",
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .reverse()
    .slice(0, 10) ?? [];

  return { provider: "xAI (Closed API)", models };
}

async function fetchOpenAiModels() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) { console.log("  OPENAI_API_KEY not set, skipping OpenAI"); return null; }

  const data = await fetchJson("https://api.openai.com/v1/models", {
    Authorization: `Bearer ${key}`,
  });

  const models = data.data
    ?.filter((m) => m.id.startsWith("gpt-") || m.id.startsWith("o"))
    .filter((m) => !m.id.includes("realtime") && !m.id.includes("audio"))
    .map((m) => ({
      id: m.id,
      name: m.id,
      context: "?",
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .reverse()
    .slice(0, 15) ?? [];

  return { provider: "OpenAI (Closed API)", models };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log("Verifying closed API models with local keys...\n");

  // Load current registry
  const jsonPath = join(ROOT, "ai-models.json");
  const current = JSON.parse(await readFile(jsonPath, "utf-8"));

  let updated = false;

  // Gemini
  try {
    const gemini = await fetchGeminiModels();
    if (gemini) {
      const currentIds = new Set(current.google_gemini?.models?.map((m) => m.id) ?? []);
      const newIds = gemini.models.filter((m) => !currentIds.has(m.id));

      if (newIds.length > 0) {
        console.log(`  Gemini: ${newIds.length} new model(s) found:`);
        for (const m of newIds) console.log(`    + ${m.id}`);
        current.google_gemini = gemini;
        updated = true;
      } else {
        console.log(`  Gemini: ${gemini.models.length} models, all known`);
      }
    }
  } catch (err) {
    console.error("  Gemini fetch failed:", err.message);
  }

  // xAI
  try {
    const xai = await fetchXaiModels();
    if (xai) {
      const currentIds = new Set(current.xai?.models?.map((m) => m.id) ?? []);
      const newIds = xai.models.filter((m) => !currentIds.has(m.id));

      if (newIds.length > 0) {
        console.log(`  xAI: ${newIds.length} new model(s) found:`);
        for (const m of newIds) console.log(`    + ${m.id}`);
        current.xai = xai;
        updated = true;
      } else {
        console.log(`  xAI: ${xai.models.length} models, all known`);
      }
    }
  } catch (err) {
    console.error("  xAI fetch failed:", err.message);
  }

  // OpenAI
  try {
    const openai = await fetchOpenAiModels();
    if (openai) {
      const currentIds = new Set(current.openai?.models?.map((m) => m.id) ?? []);
      const newIds = openai.models.filter((m) => !currentIds.has(m.id));

      if (newIds.length > 0) {
        console.log(`  OpenAI: ${newIds.length} new model(s) found:`);
        for (const m of newIds) console.log(`    + ${m.id}`);
        current.openai = openai;
        updated = true;
      } else {
        console.log(`  OpenAI: ${openai.models.length} models, all known`);
      }
    }
  } catch (err) {
    console.error("  OpenAI fetch failed:", err.message);
  }

  if (updated) {
    await writeFile(jsonPath, JSON.stringify(current, null, 2));
    console.log("\n  Updated ai-models.json — run `npm run update` to regenerate ai-models.md");
    console.log("  Then commit + push to update the registry.");
  } else {
    console.log("\n  All models up to date. No changes needed.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
