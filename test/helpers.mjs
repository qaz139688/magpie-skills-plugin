import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function tempConfig() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-skills-manager-"));
  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

export function writeLibrary(configDir, skills, extra = {}) {
  fs.writeFileSync(
    path.join(configDir, "library.json"),
    `${JSON.stringify({ skills, ...extra }, null, 2)}\n`,
    "utf8"
  );
}

export function readLibrary(configDir) {
  return JSON.parse(fs.readFileSync(path.join(configDir, "library.json"), "utf8"));
}

export function writeSkill(configDir, name, description = "") {
  const dir = path.join(configDir, "library", "skills", name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n`,
    "utf8"
  );
}

export function fakeDiscovery(agents, overrides = {}) {
  const refreshCalls = [];
  let current = {
    state: "ready",
    agents,
    warnings: [],
    error: null,
    checkedAt: 1_700_000_000_000,
    executable: "C:\\magpie.exe",
    ...overrides
  };
  return {
    snapshot() {
      return {
        ...current,
        agents: current.agents.map((agent) => ({ ...agent }))
      };
    },
    async refresh(options = {}) {
      refreshCalls.push({ ...options });
      return this.snapshot();
    },
    async ensureFresh() {
      return this.snapshot();
    },
    set(next) {
      current = { ...current, ...next };
    },
    refreshCalls
  };
}

export function updateSkillAgents(configDir, skillName, agentIds) {
  const library = readLibrary(configDir);
  const skill = library.skills.find((item) => item.name === skillName);
  if (!skill) throw new Error(`missing skill ${skillName}`);
  skill.agents = [...agentIds];
  writeLibrary(configDir, library.skills);
}

export async function makeRequest(
  service,
  {
    path: requestPath,
    method = "GET",
    pageToken = service.pageCapability || "a".repeat(64),
    session = "",
    body = undefined,
    origin = "null",
    host = "127.0.0.1:3487"
  } = {}
) {
  const headers = new Headers();
  if (host) headers.set("Host", host);
  if (origin) headers.set("Origin", origin);
  headers.set("X-Magpie-Page", pageToken);
  if (session) headers.set("X-Magpie-Session", session);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const request = new Request(`http://${host || "127.0.0.1:3487"}${requestPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const response = await service.fetch(request);
  const data = await response.json();
  return { response, data };
}

export async function sessionFor(service) {
  const { response, data } = await makeRequest(service, {
    path: "/api/session",
    method: "POST",
    body: {}
  });
  if (!response.ok) throw new Error(data.error?.message || "session failed");
  return data.token;
}
