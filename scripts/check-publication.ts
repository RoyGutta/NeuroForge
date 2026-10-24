/**
 * Fails when a tracked file must not be public. Run in CI and before pushing:
 *
 *   npm run check:publication
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { checkPublication } from "./publication";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const issues = checkPublication(files, (f) => {
  try {
    return statSync(f).size > 2_000_000 ? null : readFileSync(f, "utf8");
  } catch {
    return null;
  }
});
if (issues.length > 0) {
  console.error(`publication check failed: ${issues.length} file(s) must not be tracked`);
  for (const i of issues) console.error(`  ${i.file}: ${i.reason}`);
  process.exit(1);
}
console.log(`publication check passed: ${files.length} tracked files`);
