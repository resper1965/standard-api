import { readFileSync } from "node:fs";

export const loadGolden = <T>(pathFromEvals: string): T => {
  const url = new URL(`../${pathFromEvals}`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as T;
};
