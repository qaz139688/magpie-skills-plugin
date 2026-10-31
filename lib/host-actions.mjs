import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AppError } from "./errors.mjs";

const script = fileURLToPath(new URL("./windows-actions.ps1", import.meta.url));

export function runHostAction({ action, value = "", env = process.env }) {
  const executable = path.join(
    env.ProgramFiles || "C:\\Program Files",
    "PowerShell",
    "7",
    "pwsh.exe"
  );
  if (!fs.existsSync(executable)) {
    throw new AppError(
      "powershell_missing",
      "PowerShell 7 is required for Windows desktop actions.",
      503
    );
  }
  if (!["copy", "folder", "browse", "choose-project"].includes(action)) {
    throw new AppError("invalid_host_action", "Unknown desktop action.", 400);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["-NoProfile", "-NonInteractive", "-STA", "-File", script],
      { env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(
      () => {
        child.kill();
        reject(new AppError("host_action_timeout", "The desktop action timed out.", 504));
      },
      action === "choose-project" ? 300_000 : 20_000
    );
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new AppError("host_action_failed", error.message, 502));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new AppError(
            "host_action_failed",
            stderr.trim().slice(0, 800) || "The desktop action failed.",
            502
          )
        );
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        reject(
          new AppError("host_action_failed", "The desktop action returned an invalid result.", 502)
        );
      }
    });
    child.stdin.end(JSON.stringify({ action, value }), "utf8");
  });
}
