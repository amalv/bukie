const { spawn } = require("node:child_process");
const path = require("node:path");

const [, , command, ...restArgs] = process.argv;

if (!command) {
  console.error("Usage: node ./scripts/next-cli.cjs <command> [...args]");
  process.exit(1);
}

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  "next",
  "dist",
  "bin",
  "next",
);

const args = [nextBin, command, ...restArgs];
const env = { ...process.env };

// Next 16.1.6 ships a broken Windows native SWC binary that is missing the
// new lockfile bindings required by `next dev`/`next build`. Keep the default
// Turbopack path everywhere else, but fall back to webpack + wasm on Windows
// so local development and validation remain usable.
if (process.platform === "win32" && (command === "dev" || command === "build")) {
  const wasmDir = path.join(
    process.cwd(),
    "node_modules",
    "@next",
    "swc-wasm-nodejs",
  );

  env.NEXT_TEST_WASM = env.NEXT_TEST_WASM ?? "1";
  env.NEXT_TEST_WASM_DIR = env.NEXT_TEST_WASM_DIR ?? wasmDir;

  if (!restArgs.includes("--webpack")) {
    args.push("--webpack");
  }
}

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
