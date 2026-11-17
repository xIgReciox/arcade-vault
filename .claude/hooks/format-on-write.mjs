// PostToolUse (Write|Edit): pasa Prettier y ESLint por el archivo creado o editado.
// Solo aplica a este proyecto (se registra en .claude/settings.json).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

const LINTABLE = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const file = input?.tool_response?.filePath ?? input?.tool_input?.file_path;
if (!file || !existsSync(file)) process.exit(0);

const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
const abs = resolve(file);
const rel = relative(root, abs);

// Solo archivos dentro de este proyecto.
if (rel.startsWith("..") || resolve(rel) === rel) process.exit(0);

const run = (tool, flags) =>
  spawnSync(`npx --no-install ${tool} ${flags} "${rel}"`, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

// 1. Prettier (ignora tipos desconocidos y respeta .prettierignore).
run("prettier", "--write --ignore-unknown");

// 2. ESLint --fix solo en archivos JS/TS.
if (LINTABLE.has(extname(abs).toLowerCase())) {
  const lint = run("eslint", "--fix");
  if (lint.status !== 0) {
    // Exit 2: el stderr vuelve a Claude para que corrija lo que --fix no pudo.
    process.stderr.write(`ESLint encontró problemas en ${rel}:\n${lint.stdout}${lint.stderr}`);
    process.exit(2);
  }
}
