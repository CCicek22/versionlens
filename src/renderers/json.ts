import type { FetchResult } from "../fetchers/index.js";

export function renderJson(data: FetchResult): string {
  return JSON.stringify(data, null, 2);
}
