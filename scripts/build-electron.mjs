import { spawn } from "node:child_process";

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, ...env }
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

// Electron packaging uses file://, so Vite must emit relative asset paths.
// We do this by setting ELECTRON_BUILD=true for the Vite build.
try {
  await run("npx", ["tsc", "-b"]);
  await run("npx", ["vite", "build"], { ELECTRON_BUILD: "true" });
} catch (err) {
  console.error(err);
  process.exit(1);
}
