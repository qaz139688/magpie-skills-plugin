import {
  AGENT_BY_NAME,
  DISCOVERY_TIMEOUT_MS
} from "./constants.mjs";
import { discoverAgents, resolveMagpieExecutable } from "./cli.mjs";

function cleanLineName(value) {
  return String(value || "").trim();
}

export function parseAgentList(text) {
  const agents = [];
  const unmapped = [];
  const seen = new Set();

  for (const line of String(text || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.trimStart().split(/\s{2,}/);
    const name = cleanLineName(parts[0]);
    if (!name) continue;
    const rest = parts.slice(1).join(" ");
    if (/\bnot detected\b/i.test(rest) || /\bCLI not found\b/i.test(rest)) continue;
    if (/\bWSL\b/i.test(name)) continue;

    const catalog = AGENT_BY_NAME.get(name);
    if (!catalog) {
      if (!unmapped.includes(name)) unmapped.push(name);
      continue;
    }
    if (!catalog.skills || seen.has(catalog.id)) continue;
    seen.add(catalog.id);
    agents.push({
      id: catalog.id,
      name: catalog.name,
      initials: catalog.initials
    });
  }

  const warnings = unmapped.slice(0, 8).map(
    (name) => `${name} was detected but is not in this plugin's agent catalog.`
  );
  if (unmapped.length > 8) {
    warnings.push(
      `${unmapped.length - 8} more detected agents are not in this plugin's agent catalog.`
    );
  }
  return { agents, warnings, unmapped };
}

function errorText(error) {
  const text = error instanceof Error ? error.message : String(error || "Unknown error");
  return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

export function createDiscovery({
  env = process.env,
  configDir = process.cwd(),
  executable = "",
  runDiscovery = discoverAgents,
  now = Date.now,
  ttlMs = 15_000,
  timeoutMs = DISCOVERY_TIMEOUT_MS
} = {}) {
  let current = {
    state: "loading",
    agents: [],
    warnings: [],
    error: null,
    checkedAt: null,
    executable: executable || resolveMagpieExecutable(env)
  };
  let inflight = null;

  function snapshot() {
    return {
      ...current,
      agents: current.agents.map((agent) => ({ ...agent })),
      warnings: [...current.warnings]
    };
  }

  async function refresh({ force = false } = {}) {
    const age = current.checkedAt == null ? Infinity : now() - current.checkedAt;
    if (!force && current.state === "ready" && age < ttlMs) {
      return snapshot();
    }
    if (inflight) return inflight;

    inflight = (async () => {
      try {
        const exe = executable || resolveMagpieExecutable(env);
        if (!exe) {
          current = {
            state: "error",
            agents: [],
            warnings: [],
            error:
              "Magpie's CLI was not found. Set MAGPIE_EXE or put magpie.exe on PATH.",
            checkedAt: now(),
            executable: ""
          };
          return snapshot();
        }
        const result = await runDiscovery({
          executable: exe,
          cwd: configDir,
          env,
          timeoutMs
        });
        const parsed = parseAgentList(result.stdout);
        current = {
          state: "ready",
          agents: parsed.agents,
          warnings: parsed.warnings,
          error: null,
          checkedAt: now(),
          executable: exe
        };
      } catch (error) {
        current = {
          state: "error",
          agents: [],
          warnings: [],
          error: errorText(error),
          checkedAt: now(),
          executable: executable || resolveMagpieExecutable(env)
        };
      } finally {
        inflight = null;
      }
      return snapshot();
    })();
    return inflight;
  }

  return {
    snapshot,
    refresh,
    ensureFresh: refresh
  };
}
