import { describe, expect, test } from "vitest";
import { checkPublication } from "../../scripts/publication";

const none = () => "";

describe("publication guard", () => {
  test("rejects agent, tool, automation, database, environment and screenshot paths", () => {
    const bad = ["CLAUDE.md", "sub/CLAUDE.md", ".claude/settings.json", ".claude-flow/x.json", ".claude-mem/a", ".swarm/agentdb-memory.db", ".hive-mind/state.json", "ruvector.db", "x.db-wal", ".swarm/hnsw.index", ".playwright-mcp/page.yml", ".mcp.json", "scratchpad/a.ts", ".env", ".env.local", "id.pem", "shot.png", "src/shot.png", ".agents/x.md"];
    const hits = checkPublication(bad, none).map((i) => i.file);
    expect(hits).toEqual(bad);
  });

  test("allows the project's own files", () => {
    const ok = ["README.md", ".env.example", "docs/fig.png", "public/og.png", "src/engine/interpret/llm/provider.ts", "benchmarks/results/a.json", ".gitignore", "api/interpret.ts"];
    expect(checkPublication(ok, none)).toEqual([]);
  });

  test("flags credentials in tracked text files but not their names", () => {
    const files = ["a.ts", "b.md", "c.ts", "d.json"];
    const content: Record<string, string> = {
      "a.ts": `const k = "sk-ant-api03-${"x".repeat(40)}";`,
      "b.md": "Set ANTHROPIC_API_KEY in the server environment; never commit it.",
      "c.ts": "const token = 'ghp_" + "a".repeat(36) + "';",
      "d.json": '{"ANTHROPIC_API_KEY": "process.env"}',
    };
    expect(checkPublication(files, (f) => content[f]).map((i) => i.file)).toEqual(["a.ts", "c.ts"]);
  });
});
