import fs from "node:fs";
import path from "node:path";
import {
  AGENT_ID_RE,
  DISCOVERY_TIMEOUT_MS,
  SKILL_NAME_RE,
  WRITE_TIMEOUT_MS
} from "./constants.mjs";
import { AppError } from "./errors.mjs";

function executableFile(candidate) {
  if (!candidate) return false;
  try {
    return fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function pathCandidates(env) {
  const raw = env.Path || env.PATH || "";
  const entries = raw.split(path.delimiter).filter(Boolean);
  const extensions =
    process.platform === "win32"
      ? (env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean)
      : [""];
  const names =
    process.platform === "win32"
      ? ["magpie", "magpie.exe", "magpie-windows-amd64.exe"]
      : ["magpie", "magpie-windows-amd64"];
  const out = [];
  for (const entry of entries) {
    for (const name of names) {
      if (path.extname(name)) {
        out.push(path.join(entry, name));
      } else {
        for (const extension of extensions) {
          out.push(path.join(entry, `${name}${extension.toLowerCase()}`));
          out.push(path.join(entry, `${name}${extension.toUpperCase()}`));
        }
      }
    }
  }
  return out;
}

export function resolveMagpieExecutable(env = process.env) {
  const explicit = [env.MAGPIE_EXE, env.MAGPIE_BIN].filter(Boolean);
  for (const candidate of explicit) {
    if (executableFile(candidate)) return candidate;
  }

  for (const candidate of pathCandidates(env)) {
    if (executableFile(candidate)) return candidate;
  }

  if (process.platform === "win32") {
    const home = env.USERPROFILE || env.HOME || "";
    const local = env.LOCALAPPDATA || "";
    const programFiles = env.ProgramFiles || env.PROGRAMFILES || "";
    const common = [
      local && path.join(local, "Programs", "Magpie", "magpie.exe"),
      local && path.join(local, "Programs", "magpie", "magpie.exe"),
      programFiles && path.join(programFiles, "Magpie", "magpie.exe"),
      programFiles && path.join(programFiles, "magpie", "magpie.exe"),
      home && path.join(home, ".local", "bin", "magpie.exe"),
      home && path.join(home, ".local", "bin", "magpie-windows-amd64.exe")
    ].filter(Boolean);
    for (const candidate of common) {
      if (executableFile(candidate)) return candidate;
    }
  }
  return "";
}

function trimmedOutput(value, limit = 1200) {
  const text = String(value || "").trim();
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

export async function runMagpie(
  args,
  {
    executable,
    cwd,
    env = process.env,
    timeoutMs = DISCOVERY_TIMEOUT_MS
  } = {}
) {
  if (!executable) {
    throw new AppError(
      "magpie_cli_missing",
      "Magpie's CLI could not be found. Set MAGPIE_EXE or put magpie.exe on PATH.",
      503
    );
  }
  if (typeof Bun === "undefined" || typeof Bun.spawn !== "function") {
    throw new AppError(
      "runtime_unsupported",
      "This plugin must run inside Magpie's Bun host.",
      500
    );
  }

  let timedOut = false;
  const processHandle = Bun.spawn([executable, ...args], {
    cwd,
    env,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe"
  });
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      processHandle.kill();
    } catch {
      // The process may have exited between the check and the kill.
    }
  }, timeoutMs);

  try {
    const [stdout, stderr, code] = await Promise.all([
      new Response(processHandle.stdout).text(),
      new Response(processHandle.stderr).text(),
      processHandle.exited
    ]);
    if (timedOut) {
      throw new AppError(
        "magpie_cli_timeout",
        `Magpie's CLI did not finish within ${Math.round(timeoutMs / 1000)} seconds.`,
        504
      );
    }
    if (code !== 0) {
      const detail = trimmedOutput(stderr) || trimmedOutput(stdout) || `exit code ${code}`;
      throw new AppError("magpie_cli_failed", `Magpie's CLI failed: ${detail}`, 502);
    }
    return { stdout, stderr, code };
  } finally {
    clearTimeout(timer);
  }
}

export async function discoverAgents({
  executable,
  cwd,
  env = process.env,
  timeoutMs = DISCOVERY_TIMEOUT_MS
} = {}) {
  return runMagpie(["ls"], { executable, cwd, env, timeoutMs });
}

export async function setSkillAgents({
  executable,
  cwd,
  env = process.env,
  skillName,
  agentIds,
  timeoutMs = WRITE_TIMEOUT_MS
}) {
  if (!SKILL_NAME_RE.test(skillName)) {
    throw new AppError("invalid_skill", "Invalid skill name.", 400);
  }
  const ids = [...new Set(Array.isArray(agentIds) ? agentIds : [])].sort();
  for (const id of ids) {
    if (!AGENT_ID_RE.test(id)) {
      throw new AppError("invalid_agent", `Invalid agent id: ${id}.`, 400);
    }
  }
  const list = ids.length ? ids.join(",") : "none";
  return runMagpie(["library", "skill", "agents", skillName, list], {
    executable,
    cwd,
    env,
    timeoutMs
  });
}
