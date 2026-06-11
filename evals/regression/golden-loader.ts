import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative, isAbsolute } from "node:path";

export const loadGolden = <T>(pathFromEvals: string): T => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  const baseDir = resolve(currentDir, ".."); // evals root
  const targetPath = resolve(baseDir, pathFromEvals);

  // Check for path traversal (ensure targetPath is within baseDir)
  const relativePath = relative(baseDir, targetPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Path traversal detected: ${pathFromEvals}`);
  }

  return JSON.parse(readFileSync(targetPath, "utf8")) as T;
};
