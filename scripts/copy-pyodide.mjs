// Copies the Pyodide runtime (Python in WebAssembly) into public/pyodide so the
// authoring tool can load it from our own site. Runs before dev and build.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = dirname(require.resolve("pyodide/package.json"));
const dest = join(process.cwd(), "public", "pyodide");
const files = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

mkdirSync(dest, { recursive: true });
for (const f of files) {
  if (!existsSync(join(src, f))) throw new Error(`pyodide file missing: ${f}`);
  copyFileSync(join(src, f), join(dest, f));
}
console.log(`Copied Pyodide (${files.length} files) to public/pyodide`);
