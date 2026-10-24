/**
 * Publication guard: the repository is public, so files from local agent
 * tooling, browser automation, editors and secrets must never be tracked.
 * `checkPublication` is pure (tested); `scripts/check-publication.ts` runs it
 * over `git ls-files` in CI before anything else.
 */

/** Paths that must never be tracked, with the reason reported on a hit. */
export const FORBIDDEN_PATHS: [RegExp, string][] = [
  [/(^|\/)CLAUDE\.md$/, "agent instructions"],
  [/(^|\/)\.claude(-flow|-mem)?\//, "agent tool state"],
  [/(^|\/)\.(swarm|hive-mind|roo|agentdb)\//, "agent tool state"],
  [/(^|\/)\.agents?(\/|$)|(^|\/)\.agent[^/]*$|\.agent\.md$/, "agent instructions"],
  [/(^|\/)\.mcp\.json$|(^|\/)\.playwright-mcp\//, "MCP or browser-automation artifacts"],
  [/(^|\/)scratchpad\//, "session scratch files"],
  [/\.(db|sqlite|sqlite3)(-shm|-wal)?$|(^|\/)[^/]*\.index$/, "local databases"],
  [/(^|\/)\.env(\.(?!example$)[^/]+)?$/, "environment file"],
  [/\.(pem|key|p12|pfx)$/, "key material"],
  [/^(?!docs\/|public\/)(.*\/)?[^/]+\.png$/, "screenshot outside docs/ or public/"],
];

/** Content that looks like a credential. */
export const SECRET_PATTERNS: [RegExp, string][] = [
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "Anthropic key"],
  [/sk-(proj-)?[A-Za-z0-9]{32,}/, "OpenAI-style key"],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, "GitHub token"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key"],
  [/(ANTHROPIC|OPENAI)_API_KEY\s*=\s*["']?[A-Za-z0-9_-]{16,}/, "assigned API key"],
];

const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|yml|yaml|html|css|txt|toml)$|(^|\/)\.gitignore$/;

export interface PublicationIssue {
  file: string;
  reason: string;
}

export function checkPublication(files: string[], read: (file: string) => string | null): PublicationIssue[] {
  const issues: PublicationIssue[] = [];
  for (const file of files) {
    const path = FORBIDDEN_PATHS.find(([re]) => re.test(file));
    if (path) {
      issues.push({ file, reason: path[1] });
      continue;
    }
    if (!TEXT.test(file)) continue;
    const content = read(file);
    if (content === null) continue;
    const secret = SECRET_PATTERNS.find(([re]) => re.test(content));
    if (secret) issues.push({ file, reason: `content looks like a ${secret[1]}` });
  }
  return issues;
}
