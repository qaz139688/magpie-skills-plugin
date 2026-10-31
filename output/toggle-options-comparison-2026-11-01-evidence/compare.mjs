import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const base = "C:/Users/Cc/AppData/Local/Temp/p21-toggle-comparison-20261031";
const project = "E:/AI-Workspace/mycc/2-Projects/P21-magpie-skills-plugin";
const sidecarRoot = "C:/Users/Cc/AppData/Local/Temp/p21-sidecar-probe-20261030";
const sidecar = `${sidecarRoot}/artifacts/p21-skills-probe.exe`;
const live = "C:/Users/Cc/.config/magpie";
const executable = "E:/magpie.com";
const pageSource = `${project}/page`;
const { createService } = await import(pathToFileURL(`${project}/lib/service.mjs`));
const { createDiscovery } = await import(pathToFileURL(`${project}/lib/discovery.mjs`));
const { runMagpie, setSkillAgents } = await import(pathToFileURL(`${project}/lib/cli.mjs`));
const { makeRequest, sessionFor } = await import(pathToFileURL(`${project}/test/helpers.mjs`));

const sha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const liveBefore = sha(`${live}/library.json`);
const appBefore = sha(`${project}/page/app.js`);
fs.mkdirSync(base, { recursive: true });
const run = randomUUID().slice(0, 8);
const fixtures = [];
const results = { run, cli: "", pageBefore: appBefore, liveBefore, scenarios: {}, checks: [] };

function check(name, passed, details = {}) {
  results.checks.push({ name, passed: Boolean(passed), ...details });
  console.log("CHECK", JSON.stringify(results.checks.at(-1)));
  if (!passed) throw new Error(name);
}

function copyPages() {
  const baseline = path.join(base, "page-baseline");
  const optimistic = path.join(base, "page-optimistic");
  fs.cpSync(pageSource, baseline, { recursive: true });
  fs.cpSync(pageSource, optimistic, { recursive: true });
  const file = path.join(optimistic, "app.js");
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(
    '    busyProjectSkill: "",',
    '    busyProjectSkill: "",\n    agentIntents: new Map(),'
  );
  const replacement = String.raw`  function setOptimisticAgent(skillName, agentId, enabled) {
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    if (!skill) return;
    const agents = new Set(skill.assignedAgents || []);
    if (enabled) agents.add(agentId);
    else agents.delete(agentId);
    skill.assignedAgents = [...agents].sort();
    renderAll();
  }

  async function mutateAgent(skillName, agentId, enabled) {
    const key = skillName + "\n" + agentId;
    const existing = state.agentIntents.get(key);
    if (existing) {
      existing.enabled = enabled;
      setOptimisticAgent(skillName, agentId, enabled);
      return;
    }
    const skill = state.data?.skills?.find((item) => item.name === skillName);
    const intent = {
      enabled,
      initial: Boolean(skill?.assignedAgents?.includes(agentId))
    };
    state.agentIntents.set(key, intent);
    state.rowErrors.delete(skillName);
    setOptimisticAgent(skillName, agentId, enabled);
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (intent.enabled === intent.initial) return;
      let sent = null;
      while (sent !== intent.enabled) {
        sent = intent.enabled;
        const data = await api(
          "api/skills/" + encodeURIComponent(skillName) + "/agents",
          { method: "POST", body: { agentId, enabled: sent } }
        );
        setData(data);
        if (intent.enabled !== sent) {
          setOptimisticAgent(skillName, agentId, intent.enabled);
        }
      }
      const agent = state.data.agents.find((item) => item.id === agentId);
      showToast(
        t("agentApplied", {
          agent: agent?.name || agentId,
          skill: skillName
        })
      );
    } catch (error) {
      if (error.state) setData(error.state);
      state.rowErrors.set(skillName, error.message || t("errorFallback"));
      showToast(error.message || t("errorFallback"), "error");
    } finally {
      state.agentIntents.delete(key);
      renderAll();
    }
  }

  function openLabelDialog`;
  const start = source.indexOf("  async function mutateAgent(skillName, agentId, enabled) {");
  const end = source.indexOf("  function openLabelDialog", start);
  if (start < 0 || end < 0) throw new Error("Could not patch optimistic app");
  source = source.slice(0, start) + replacement + source.slice(end + "  function openLabelDialog".length);
  fs.writeFileSync(file, source);
  return { baseline, optimistic };
}

const pages = copyPages();

const envSource = fs.readFileSync(`${sidecarRoot}/upstream/magpie-0414bbeddbfc2028508b610fd1e7c194143454a0/internal/agentenv/agentenv.go`, "utf8");
const cleared = [...new Set([...envSource.matchAll(/"([A-Z][A-Z0-9_]*)"/g)].map((match) => match[1]))];

function isolatedEnv(dir) {
  const env = { ...process.env };
  for (const key of cleared) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^(MAGPIE_WEB_KEY|MAGPIE_ADDR|MAGPIE_EXE|MAGPIE_BIN|OPENCODE_CONFIG_CONTENT)$/.test(key)) delete env[key];
  }
  const dirs = {
    HOME: dir,
    USERPROFILE: dir,
    XDG_CONFIG_HOME: path.join(dir, ".config"),
    XDG_CACHE_HOME: path.join(dir, ".cache"),
    XDG_DATA_HOME: path.join(dir, ".local", "share"),
    XDG_STATE_HOME: path.join(dir, ".local", "state"),
    APPDATA: path.join(dir, "AppData", "Roaming"),
    LOCALAPPDATA: path.join(dir, "AppData", "Local"),
    CODEX_HOME: path.join(dir, ".codex"),
    CLAUDE_CONFIG_DIR: path.join(dir, ".claude"),
    PI_CODING_AGENT_DIR: path.join(dir, ".pi", "agent"),
    HERMES_HOME: path.join(dir, ".hermes")
  };
  for (const folder of Object.values(dirs)) fs.mkdirSync(folder, { recursive: true });
  fs.mkdirSync(path.join(dir, "bin"), { recursive: true });
  for (const name of ["codex", "claude", "powershell", "pwsh", "wsl", "cmdkey"]) {
    fs.linkSync(sidecar, path.join(dir, "bin", `${name}.exe`));
  }
  fs.writeFileSync(path.join(dirs.CODEX_HOME, "config.toml"), "");
  fs.writeFileSync(path.join(dirs.CLAUDE_CONFIG_DIR, "settings.json"), "{}");
  return Object.assign(env, dirs, {
    PATH: `${path.join(dir, "bin")};C:\\Windows\\System32`,
    Path: `${path.join(dir, "bin")};C:\\Windows\\System32`,
    MAGPIE_PLUGIN_MARKET: "off",
    MAGPIE_BUN: "C:/Users/Cc/.cache/magpie/bun/1.4.4/magpie-bun.exe"
  });
}

function createFixture(name, root = base) {
  const dir = path.join(root, "fixtures", `${run}-${name}`);
  if (fs.existsSync(dir)) throw new Error(`Fixture exists: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
  const configDir = path.join(dir, ".config", "magpie");
  fs.mkdirSync(configDir, { recursive: true });
  const env = isolatedEnv(dir);
  Object.assign(env, {
    P21_PROBE_ROOT: dir,
    MAGPIE_TEST_SANDBOX: dir
  });
  fs.writeFileSync(path.join(configDir, "settings.json"),
    JSON.stringify({ gatewayMode: "", noWSLAgents: true }));
  const library = {
    skills: ["alpha", "beta", "gamma"].map((skill) => ({
      name: skill,
      agents: ["opencode"]
    })),
    mcp: [],
    projects: []
  };
  fs.writeFileSync(path.join(configDir, "library.json"), JSON.stringify(library, null, 2));
  for (const skill of library.skills) {
    const folder = path.join(configDir, "library", "skills", skill.name);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "SKILL.md"),
      `---\nname: ${skill.name}\ndescription: Isolated comparison fixture\n---\n\n# ${skill.name}\n`);
    fs.writeFileSync(path.join(folder, "payload.txt"), `${skill.name}\n`);
  }
  const context = { name, dir, configDir, env };
  fixtures.push({ name, dir });
  return context;
}

function resetFixture(fixture) {
  const file = path.join(fixture.configDir, "library.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const skill of data.skills) {
    skill.agents = ["opencode"];
    delete skill.offHere;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const codex = path.join(fixture.dir, ".codex", "skills");
  if (fs.existsSync(codex)) fs.rmSync(codex, { recursive: true });
}

function skillAgents(fixture, name = "alpha") {
  const data = JSON.parse(fs.readFileSync(path.join(fixture.configDir, "library.json"), "utf8"));
  return data.skills.find((skill) => skill.name === name).agents;
}

async function discoveryFor(fixture, stats) {
  const discovery = createDiscovery({
    configDir: fixture.configDir,
    env: fixture.env,
    executable,
    runDiscovery: async (options) => {
      const started = performance.now();
      const output = await runMagpie(["ls"], options);
      stats.discovery.push({
        ms: Math.round(performance.now() - started),
        requestedAt: new Date().toISOString()
      });
      return output;
    }
  });
  await discovery.refresh({ force: true });
  return discovery;
}

function cached(discovery) {
  return {
    snapshot: discovery.snapshot,
    refresh: () => discovery.refresh({ force: false }),
    ensureFresh: () => discovery.refresh({ force: false })
  };
}

async function cliWrite({ fixture, skillName, agentIds, stats }) {
  const started = performance.now();
  const result = await setSkillAgents({
    executable,
    cwd: fixture.configDir,
    env: fixture.env,
    skillName,
    agentIds
  });
  stats.writes.push({
    ms: Math.round(performance.now() - started),
    skillName,
    agentIds: [...agentIds],
    stderrBytes: result.stderr.length
  });
}

class SidecarWorker {
  constructor(fixture) {
    this.fixture = fixture;
    this.next = 0;
    this.pending = new Map();
    this.proc = Bun.spawn([sidecar], {
      env: fixture.env,
      cwd: fixture.configDir,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe"
    });
    this.stderr = new Response(this.proc.stderr).text();
    this.reader = (async () => {
      let buffer = "";
      for await (const chunk of this.proc.stdout) {
        buffer += new TextDecoder().decode(chunk, { stream: true });
        let at;
        while ((at = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, at);
          buffer = buffer.slice(at + 1);
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          this.pending.get(data.id)?.(data);
          this.pending.delete(data.id);
        }
      }
    })();
  }
  request(body) {
    const id = ++this.next;
    const started = performance.now();
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("sidecar timeout")), 30000);
      this.pending.set(id, (data) => {
        clearTimeout(timer);
        resolve({ ...data, wallMs: performance.now() - started });
      });
    });
    this.proc.stdin.write(`${JSON.stringify({ ...body, id })}\n`);
    this.proc.stdin.flush();
    return done;
  }
  async stop() {
    this.proc.stdin.end();
    await Promise.race([this.proc.exited, Bun.sleep(5000).then(() => this.proc.kill())]);
    await this.reader;
    await this.stderr;
  }
}

function staticFetch(pageDir, service, stats, token) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png"
  };
  return async (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/__bench/summary") {
      return Response.json({
        scenario: stats.scenario,
        discovery: stats.discovery,
        writes: stats.writes,
        mutations: stats.mutations
      });
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/avatars/")) {
      const started = performance.now();
      try {
        // The real plugin page is sandboxed and reaches the service with an
        // opaque origin. This direct harness page is not, so reproduce that
        // boundary instead of changing service authorization.
        const headers = new Headers(request.headers);
        headers.set("Origin", "null");
        return await service.fetch(new Request(request, { headers }));
      } finally {
        if (request.method === "POST") {
          stats.mutations.push({
            path: url.pathname,
            ms: Math.round(performance.now() - started),
            at: new Date().toISOString()
          });
        }
      }
    }
    let relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    relative = decodeURIComponent(relative);
    const file = path.resolve(pageDir, relative);
    if (!file.startsWith(path.resolve(pageDir) + path.sep)) {
      return new Response("not found", { status: 404 });
    }
    try {
      return new Response(fs.readFileSync(file), {
        headers: { "Content-Type": types[path.extname(file)] || "application/octet-stream" }
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  };
}

async function createCliScenario({ name, pageDir, cache }) {
  const fixture = createFixture(name);
  const stats = {
    scenario: name,
    discovery: [],
    writes: [],
    mutations: []
  };
  const discovery = await discoveryFor(fixture, stats);
  const agentDiscovery = cache ? cached(discovery) : discovery;
  const token = randomBytes(32).toString("hex");
  const service = createService({
    configDir: fixture.configDir,
    env: fixture.env,
    executable,
    pluginDir: project,
    pageCapability: token,
    agentDiscovery,
    setAgents: (args) => cliWrite({ fixture, stats, ...args }),
    hostAction: async () => ({}),
    syncLibrary: async () => ({})
  });
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: staticFetch(pageDir, service, stats, token)
  });
  return {
    name, fixture, stats, token, service, server,
    url: `http://127.0.0.1:${server.port}/#page=${token}&lang=zh`,
    stop: () => server.stop(true)
  };
}

async function createSidecarScenario() {
  const fixture = createFixture("resident-sidecar", sidecarRoot);
  const stats = {
    scenario: "resident-sidecar",
    discovery: [],
    writes: [],
    mutations: []
  };
  const worker = new SidecarWorker(fixture);
  const ping = await worker.request({ op: "ping" });
  check("sidecar starts in isolated profile", ping.ok);
  const found = await worker.request({ op: "agents" });
  check("sidecar discovers Codex", found.ok && found.agents.some((agent) => agent.id === "codex"));
  const snapshot = {
    state: "ready",
    agents: found.agents.map((agent) => ({ ...agent, installed: true })),
    warnings: [],
    error: null,
    checkedAt: Date.now(),
    executable: sidecar
  };
  const token = randomBytes(32).toString("hex");
  const service = createService({
    configDir: fixture.configDir,
    env: fixture.env,
    executable: sidecar,
    pluginDir: project,
    pageCapability: token,
    agentDiscovery: {
      snapshot: () => ({ ...snapshot, agents: snapshot.agents.map((agent) => ({ ...agent })) }),
      refresh: async () => ({ ...snapshot, agents: snapshot.agents.map((agent) => ({ ...agent })) }),
      ensureFresh: async () => ({ ...snapshot, agents: snapshot.agents.map((agent) => ({ ...agent })) })
    },
    setAgents: async ({ skillName, agentIds }) => {
      const current = new Set(skillAgents(fixture, skillName).filter((id) => id !== "opencode"));
      const next = new Set(agentIds.filter((id) => id !== "opencode"));
      const started = performance.now();
      for (const id of current) {
        if (!next.has(id)) {
          const result = await worker.request({ op: "toggle", name: skillName, agent: id, enabled: false });
          if (!result.ok) throw new Error(result.error);
        }
      }
      for (const id of next) {
        if (!current.has(id)) {
          const result = await worker.request({ op: "toggle", name: skillName, agent: id, enabled: true });
          if (!result.ok) throw new Error(result.error);
        }
      }
      stats.writes.push({ ms: Math.round(performance.now() - started), skillName, agentIds: [...agentIds] });
    },
    hostAction: async () => ({}),
    syncLibrary: async () => ({})
  });
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: staticFetch(pages.optimistic, service, stats, token)
  });
  return {
    name: "resident-sidecar",
    fixture,
    stats,
    token,
    service,
    server,
    url: `http://127.0.0.1:${server.port}/#page=${token}&lang=zh`,
    stop: async () => {
      server.stop(true);
      await worker.stop();
    }
  };
}

const cliVersion = await runMagpie(["--version"], { executable });
results.cli = cliVersion.stdout.trim();
const scenarios = [
  await createCliScenario({ name: "baseline", pageDir: pages.baseline, cache: false }),
  await createCliScenario({ name: "A-cache", pageDir: pages.baseline, cache: true }),
  await createCliScenario({ name: "B-feedback", pageDir: pages.optimistic, cache: false }),
  await createCliScenario({ name: "A+B", pageDir: pages.optimistic, cache: true }),
  await createSidecarScenario()
];

results.scenarios = Object.fromEntries(scenarios.map((scenario) => [
  scenario.name,
  { url: scenario.url, fixture: scenario.fixture.dir, stats: scenario.stats }
]));

fs.writeFileSync(path.join(base, "manifest.json"), JSON.stringify({
  run,
  cli: results.cli,
  scenarios: Object.fromEntries(scenarios.map((scenario) => [scenario.name, {
    url: scenario.url,
    fixture: scenario.fixture.dir
  }]))
}, null, 2));

console.log("SCENARIOS", JSON.stringify(Object.fromEntries(
  scenarios.map((scenario) => [scenario.name, scenario.url])
)));

async function shutdown() {
  for (const scenario of scenarios) {
    try {
      await scenario.stop();
    } catch {}
  }
  results.liveLibraryUnchanged = liveBefore === sha(`${live}/library.json`);
  results.pageUnchanged = appBefore === sha(`${project}/page/app.js`);
  fs.writeFileSync(path.join(base, `results-${run}.json`), JSON.stringify(results, null, 2));
  console.log("RESULTS", path.join(base, `results-${run}.json`));
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
await new Promise(() => {});
