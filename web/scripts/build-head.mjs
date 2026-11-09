// The scripts a page runs in its <head>, before React (theme by the clock, the brand mark, the native bridge, the swipe and
// arrival transitions, the service worker). They are written in TypeScript in src/head/ and compiled here to plain scripts in
// public/app/, which the layouts load with <script src>. Types are stripped only: no bundling, no module wrapper, so each file
// still runs as the classic script it always was. The few that must run before the first paint (src/head/inline/) are compiled
// to .head-inline/ instead, and the layouts write them into the page (headInline in src/legacy/read.ts). Runs before dev and
// build; the compiled copies are not committed.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import nextEnv from "@next/env";
import ts from "typescript";

/* A head script has no bundler to inline NEXT_PUBLIC_* for it, so this does: the .env files the way Next reads them, then
   each process.env.NEXT_PUBLIC_X becomes its value as a string (or `undefined`, so the script's own fallback applies). */
nextEnv.loadEnvConfig(process.cwd());
const inlineEnv = (src) =>
  src.replace(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g, (_, k) => (process.env[k] ? JSON.stringify(process.env[k]) : "undefined"));

for (const [from, to] of [["src/head", "public/app"], ["src/head/inline", ".head-inline"]]) {
  mkdirSync(to, { recursive: true });
  for (const f of readdirSync(from)) {
    if (!f.endsWith(".ts") || f.endsWith(".d.ts") || f.endsWith(".test.ts")) continue;
    const out = ts.transpileModule(readFileSync(`${from}/${f}`, "utf8"), {
      fileName: f,
      compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.ESNext, removeComments: false },
    }).outputText.replace(/^export \{\};\s*$/m, "");
    /* A file needs `export {}` only to keep its own types to itself (sw.ts); anything more would not run as a classic script. */
    if (/^(import|export)\b/m.test(out)) throw new Error(`${from}/${f} imports or exports; a <head> script cannot`);
    writeFileSync(`${to}/${f.replace(/\.ts$/, ".js")}`, inlineEnv(out));
  }
}
