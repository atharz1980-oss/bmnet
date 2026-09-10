import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);
// Only remove this project's generated Next.js output.
rmSync(resolve(root, ".next"), { recursive: true, force: true });
const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  cwd: root, stdio: "inherit", env: process.env,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
const standalone = resolve(root, ".next/standalone");
mkdirSync(resolve(standalone, ".next"), { recursive: true });
cpSync(resolve(root, ".next/static"), resolve(standalone, ".next/static"), { recursive: true });
if (existsSync(resolve(root, "public"))) {
  cpSync(resolve(root, "public"), resolve(standalone, "public"), { recursive: true });
}
