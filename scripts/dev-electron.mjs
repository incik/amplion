import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const electronBin =
  process.platform === "win32"
    ? path.join(projectRoot, "node_modules", ".bin", "electron.cmd")
    : path.join(projectRoot, "node_modules", ".bin", "electron");

const watchedFiles = [
  path.join(projectRoot, "build", "main", "main.js"),
  path.join(projectRoot, "renderer_dist", "assets", "index.js"),
  path.join(projectRoot, "renderer_dist", "assets", "index.css"),
  path.join(projectRoot, "build", "preload", "preload.js"),
];

function waitForFiles(files) {
  return new Promise((resolve) => {
    const tick = () => {
      const allExist = files.every((filePath) => fs.existsSync(filePath));
      if (allExist) return resolve();
      setTimeout(tick, 150);
    };
    tick();
  });
}

let electronProcess = null;
let restartTimer = null;
let restarting = false;

function startElectron() {
  if (!fs.existsSync(electronBin)) {
    console.error("Electron binary not found:", electronBin);
    process.exitCode = 1;
    return;
  }

  console.log("[dev-electron] starting:", electronBin, ".");
  electronProcess = spawn(electronBin, ["."], {
    stdio: "inherit",
    env: process.env,
  });

  electronProcess.on("exit", (code, signal) => {
    if (!restarting) {
      console.log("[dev-electron] exited:", { code, signal });
    }
    electronProcess = null;
  });
}

async function stopElectron() {
  if (!electronProcess) return;

  restarting = true;

  const proc = electronProcess;
  electronProcess = null;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        proc.kill("SIGKILL");
      } catch {}
      resolve();
    }, 2000);

    proc.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });

    try {
      proc.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });

  restarting = false;
}

async function restartElectron(reason) {
  if (restartTimer) clearTimeout(restartTimer);

  restartTimer = setTimeout(async () => {
    console.log("[dev-electron] restart:", reason);
    await stopElectron();
    await waitForFiles(watchedFiles);
    startElectron();
  }, 250);
}

function watchFile(filePath) {
  // fs.watch is lossy on some editors; fallback to watchFile if it errors.
  try {
    const watcher = fs.watch(filePath, { persistent: true }, (eventType) => {
      if (eventType === "rename" || eventType === "change") {
        restartElectron(path.relative(projectRoot, filePath));
      }
    });
    watcher.on("error", () => {
      fs.watchFile(filePath, { interval: 200 }, () => {
        restartElectron(path.relative(projectRoot, filePath));
      });
    });
  } catch {
    fs.watchFile(filePath, { interval: 200 }, () => {
      restartElectron(path.relative(projectRoot, filePath));
    });
  }
}

async function main() {
  console.log("[dev-electron] waiting for build outputs...");
  await waitForFiles(watchedFiles);

  watchedFiles.forEach(watchFile);
  startElectron();
}

process.on("SIGINT", async () => {
  console.log("\n[dev-electron] SIGINT");
  await stopElectron();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[dev-electron] SIGTERM");
  await stopElectron();
  process.exit(0);
});

main().catch((err) => {
  console.error("[dev-electron] fatal:", err);
  process.exit(1);
});
