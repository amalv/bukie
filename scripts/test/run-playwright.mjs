import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const port = "3011";
const baseURL = `http://127.0.0.1:${port}`;
const runtimeEnv = {
  ...process.env,
  BUKIE_DB_DRIVER: "sqlite",
  BUKIE_SQLITE_PATH: path.resolve(
    ".data",
    "catalog-targets",
    "playwright-runtime.sqlite",
  ),
  MEDIA_BACKEND: "local",
  MEDIA_CACHE_ENABLED: "0",
  NEXT_DIST_DIR: ".next-playwright",
  PORT: port,
};
const nextBin = path.resolve("node_modules/next/dist/bin/next");
const playwrightBin = path.resolve("node_modules/@playwright/test/cli.js");

const build = spawnSync(process.execPath, [nextBin, "build"], {
  env: runtimeEnv,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);

const server = spawn(process.execPath, [nextBin, "start"], {
  env: runtimeEnv,
  stdio: "inherit",
});

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function stopServer() {
  if (server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(2_000),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(500);
  }
  throw new Error(`Playwright server did not become ready at ${baseURL}`);
}

const shutdown = () => {
  void stopServer().finally(() => process.exit(1));
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

try {
  await waitUntilReady();
  const test = spawnSync(
    process.execPath,
    [playwrightBin, "test", ...process.argv.slice(2)],
    {
      env: { ...process.env, PLAYWRIGHT_BASE_URL: baseURL },
      stdio: "inherit",
    },
  );
  process.exitCode = test.status ?? 1;
} finally {
  await stopServer();
}
