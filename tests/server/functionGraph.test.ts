import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * Vercel compiles `api/*.ts` file by file into native ES modules, where a
 * relative import without an extension fails at load time
 * (FUNCTION_INVOCATION_FAILED in production on 2026-10-18). This walks the
 * function's runtime import graph and requires explicit `.js` specifiers; it
 * also keeps the graph small, away from the domain engine.
 */
const ROOT = resolve(__dirname, "../..");
const VALUE_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\sfrom\s+)?["'](\.{1,2}\/[^"']+)["']/gm;

function runtimeGraph(entry: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const stack = [entry];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (graph.has(file)) continue;
    const specs = Array.from(readFileSync(file, "utf8").matchAll(VALUE_IMPORT), (m) => m[1]);
    graph.set(file, specs);
    for (const s of specs) stack.push(resolve(dirname(file), s.replace(/\.js$/, ".ts")));
  }
  return graph;
}

describe("the interpretation function loads as native ES modules", () => {
  const graph = runtimeGraph(resolve(ROOT, "api/interpret.ts"));

  test("every runtime relative import names its .js file", () => {
    const bad = [...graph].flatMap(([file, specs]) => specs.filter((s) => !s.endsWith(".js")).map((s) => `${file.replace(ROOT, "")}: ${s}`));
    expect(bad).toEqual([]);
  });

  test("the graph stays out of the domain engine and the interface", () => {
    const files = [...graph.keys()].map((f) => f.replace(`${ROOT}/`, ""));
    expect(files.some((f) => f.startsWith("src/engine/domains") || f.startsWith("src/pages") || f.includes("realize"))).toBe(false);
    expect(files).toContain("src/server/interpretHandler.ts");
    expect(files).toContain("src/engine/interpret/llm/generator.ts");
  });
});
