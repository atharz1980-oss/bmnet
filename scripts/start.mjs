import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import nextEnv from "@next/env";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.NODE_ENV = "production";
nextEnv.loadEnvConfig(root, false);
const server = resolve(root, ".next/standalone/server.js");
if (!existsSync(server)) {
  console.error("Production build missing. Run: bun run build");
  process.exit(1);
}
const child = spawn(process.execPath, [server], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: process.env.PORT || "3000", HOSTNAME: process.env.HOSTNAME || "127.0.0.1" },
});
child.on("error", (error) => { console.error(error); process.exit(1); });
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
