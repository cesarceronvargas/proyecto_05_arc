// PostToolUse hook: formats the written/edited file with Prettier and lints it with ESLint.
// Exits 2 with the remaining ESLint errors on stderr so Claude can fix them.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const projectDir = path.resolve(
  process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
);
const LINTABLE = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const IGNORED_DIRS = ["node_modules", ".next", "references"];

let input;
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const absolute = path.resolve(filePath);
const relative = path.relative(projectDir, absolute);
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);
if (IGNORED_DIRS.includes(relative.split(path.sep)[0])) process.exit(0);

const run = (args) =>
  spawnSync("npx", ["--no-install", ...args, `"${relative}"`], {
    cwd: projectDir,
    encoding: "utf8",
    shell: true,
  });

const prettier = run([
  "prettier",
  "--write",
  "--ignore-unknown",
  "--log-level",
  "warn",
]);
if (prettier.status !== 0) {
  process.stderr.write(
    `Prettier failed on ${relative}:\n${prettier.stderr || prettier.stdout}`,
  );
  process.exit(2);
}

if (LINTABLE.has(path.extname(absolute))) {
  const eslint = run(["eslint", "--fix", "--no-warn-ignored"]);
  if (eslint.status !== 0) {
    process.stderr.write(
      `ESLint found problems in ${relative}:\n${eslint.stdout}${eslint.stderr}`,
    );
    process.exit(2);
  }
}

process.exit(0);
