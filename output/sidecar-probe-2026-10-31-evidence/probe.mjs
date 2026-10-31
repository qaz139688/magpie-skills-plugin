import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const base = "C:/Users/Cc/AppData/Local/Temp/p21-sidecar-probe-20261030";
const source = `${base}/upstream/magpie-0414bbeddbfc2028508b610fd1e7c194143454a0`;
const executable = `${base}/artifacts/p21-skills-probe.exe`;
const project = "E:/AI-Workspace/mycc/2-Projects/P21-magpie-skills-plugin";
const live = "C:/Users/Cc/.config/magpie";
const { runMagpie } = await import(pathToFileURL(`${project}/lib/cli.mjs`));
const sha = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const liveBefore = sha(`${live}/library.json`);
const magpieBefore = sha("E:/magpie-windows-amd64.exe");
const envSource = fs.readFileSync(`${source}/internal/agentenv/agentenv.go`, "utf8");
const cleared = [...new Set([...envSource.matchAll(/"([A-Z][A-Z0-9_]*)"/g)].map((m) => m[1]))];
const run = randomUUID().slice(0, 8);
const result = { run, sourceCommit: "0414bbeddbfc2028508b610fd1e7c194143454a0",
  timings: [], checks: [], fixtures: [], events: [] };

function check(name, condition, details = {}) {
  result.checks.push({ name, passed: Boolean(condition), ...details });
  console.log("CHECK", JSON.stringify(result.checks.at(-1)));
  if (!condition) throw new Error(name);
}

function fixture(name, { plugins = false, hidden = false, copy = false, offHere = false } = {}) {
  const dir = `${base}/fixtures/${run}-${name}`;
  fs.mkdirSync(dir);
  const configDir = path.join(dir, ".config", "magpie");
  const env = { ...process.env };
  for (const key of cleared) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^(MAGPIE_WEB_KEY|MAGPIE_ADDR|MAGPIE_EXE|MAGPIE_BIN|OPENCODE_CONFIG_CONTENT)$/.test(key)) delete env[key];
  }
  const dirs = {
    HOME: dir, USERPROFILE: dir,
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
  fs.mkdirSync(configDir, { recursive: true });
  Object.assign(env, dirs, {
    P21_PROBE_ROOT: dir, MAGPIE_TEST_SANDBOX: dir,
    MAGPIE_PLUGIN_MARKET: "off",
    MAGPIE_BUN: "C:/Users/Cc/.cache/magpie/bun/1.4.4/magpie-bun.exe",
    PATH: path.join(dir, "bin") + ";C:\\Windows\\System32",
    Path: path.join(dir, "bin") + ";C:\\Windows\\System32"
  });
  fs.mkdirSync(path.join(dir, "bin"));
  for (const name of ["codex", "claude", "powershell", "pwsh", "wsl", "cmdkey"]) {
    fs.linkSync(executable, path.join(dir, "bin", `${name}.exe`));
  }
  fs.writeFileSync(path.join(dirs.CODEX_HOME, "config.toml"), "");
  fs.writeFileSync(path.join(dirs.CLAUDE_CONFIG_DIR, "settings.json"), "{}");
  fs.writeFileSync(path.join(configDir, "settings.json"),
    JSON.stringify({ gatewayMode: "", noWSLAgents: true }));
  const skills = ["alpha", "beta", "gamma"].map((name) => ({
    name, agents: hidden ? ["hidden-history"] : [], offHere: name === "alpha" && offHere
  }));
  fs.writeFileSync(path.join(configDir, "library.json"),
    JSON.stringify({ skills, mcp: [], projects: [], ...(copy ? { skillHow: "copy" } : {}) }));
  for (const { name } of skills) {
    const folder = path.join(configDir, "library", "skills", name);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "SKILL.md"),
      `---\nname: ${name}\ndescription: Isolated sidecar probe\n---\n\n# ${name}\n`);
    fs.writeFileSync(path.join(folder, "payload.txt"), `fixture-${name}\n`);
  }
  if (plugins) {
    fs.cpSync(`${live}/plugins`, path.join(configDir, "plugins"), { recursive: true });
    const registry = JSON.parse(fs.readFileSync(`${live}/plugins.json`, "utf8"));
    fs.writeFileSync(path.join(configDir, "plugins.json"), JSON.stringify({
      plugins: registry.plugins.filter((p) => p.spec.startsWith("@magpie-community/"))
        .map(({ spec, off }) => ({ spec, off: Boolean(off) }))
    }));
  }
  const context = { dir, configDir, env, name };
  result.fixtures.push({ name, dir, plugins, hidden, copy, offHere });
  return context;
}

function read(context) {
  return JSON.parse(fs.readFileSync(path.join(context.configDir, "library.json"), "utf8"));
}
function agents(context, name = "alpha") {
  return read(context).skills.find((s) => s.name === name).agents;
}
function link(context, name = "alpha") {
  return path.join(context.dir, ".codex", "skills", name);
}
function untouched() {
  check("live library and installed Magpie unchanged",
    liveBefore === sha(`${live}/library.json`) && magpieBefore === sha("E:/magpie-windows-amd64.exe"));
}

class Worker {
  constructor(context) {
    this.context = context;
    this.nextID = 0;
    this.pending = new Map();
    this.events = new Map();
    this.proc = Bun.spawn([executable], { env: context.env, cwd: context.configDir,
      stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    this.stderr = new Response(this.proc.stderr).text();
    this.reader = (async () => {
      let buffer = "";
      const decoder = new TextDecoder();
      for await (const chunk of this.proc.stdout) {
        buffer += decoder.decode(chunk, { stream: true });
        let at;
        while ((at = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, at); buffer = buffer.slice(at + 1);
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.event) {
            result.events.push(data);
            this.events.get(data.id)?.(data);
          } else {
            this.pending.get(data.id)?.(data);
            this.pending.delete(data.id);
          }
        }
      }
    })();
  }
  send(body, event = false) {
    const id = ++this.nextID;
    const start = performance.now();
    let timer;
    const done = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("Worker timeout")), 45000);
      this.pending.set(id, (data) => {
        clearTimeout(timer);
        resolve({ ...data, wallMs: performance.now() - start });
      });
    });
    const barrier = event ? new Promise((resolve) => this.events.set(id, resolve)) : null;
    this.proc.stdin.write(JSON.stringify({ ...body, id }) + "\n");
    this.proc.stdin.flush();
    return { id, done, barrier };
  }
  async request(body) { return this.send(body).done; }
  async stop() {
    this.proc.stdin.end();
    await Promise.race([this.proc.exited, Bun.sleep(10000).then(() => this.proc.kill())]);
    await this.reader;
    const stderr = await this.stderr;
    fs.writeFileSync(`${base}/artifacts/${run}-${this.context.name}-stderr.log`, stderr);
  }
}

async function cli(context, name, enabled) {
  if (fs.existsSync("E:/.portable") || fs.existsSync("E:/data"))
    throw new Error("Refusing to run potentially portable installed Magpie");
  const start = performance.now();
  const output = await runMagpie(["library", "skill", "agents", name, enabled ? "codex" : "none"],
    { executable: "E:/magpie.com", cwd: context.configDir, env: context.env, timeoutMs: 45000 });
  return { wallMs: performance.now() - start, stderrBytes: output.stderr.length };
}

try {
  const version = await runMagpie(["--version"], { executable: "E:/magpie.com" });
  result.installedVersion = version.stdout.trim();
  const invalid = Bun.spawnSync([executable], { env: { ...process.env, P21_PROBE_ROOT: "" },
    stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  check("probe refuses a real or unmarked profile", invalid.exitCode === 2);
  for (const plugins of [false, true]) {
    const f = fixture(plugins ? "public-plugins" : "plain", { plugins });
    const worker = new Worker(f);
    try {
      check("worker ping", (await worker.request({ op: "ping" })).ok);
      const discovered = await worker.request({ op: "agents" });
      check("native discovery includes fixture Codex and Claude only",
        discovered.ok && ["codex", "claude"].every((id) => discovered.agents.some((a) => a.id === id)) &&
        discovered.agents.every((a) => !a.id.includes("@wsl:")),
        { discoveryMs: discovered.wallMs, ids: discovered.agents.map((a) => a.id) });
      result.timings.push({ kind: "worker-first-toggle", plugins,
        ...(await worker.request({ op: "toggle", name: "alpha", agent: "codex", enabled: true })) });
      for (let i = 0; i < 10; i++) {
        if (i === 6) await Bun.sleep(2500);
        const on = i % 2 === 1;
        const response = await worker.request({ op: "toggle", name: "alpha", agent: "codex", enabled: on });
        check("warm native write and distribution", response.ok &&
          (response.result?.problems?.length || 0) === 0 &&
          agents(f).includes("codex") === on && fs.existsSync(link(f)) === on);
        result.timings.push({ kind: "worker-warm-toggle", plugins, on, wallMs: response.wallMs, nativeMs: response.ms });
      }
      const noChange = await worker.request({ op: "toggle", name: "alpha", agent: "codex", enabled: true });
      check("no-op skips native sync", noChange.ok && !noChange.result, { wallMs: noChange.wallMs });
      for (let i = 0; i < 4; i++) {
        const on = i % 2 === 1;
        const response = await cli(f, "alpha", on);
        check("installed CLI writes the same isolated profile", agents(f).includes("codex") === on);
        result.timings.push({ kind: "installed-cli-toggle", plugins, on, ...response });
      }
      const start = performance.now();
      const cold = Bun.spawn([executable, "--one-shot"], { env: f.env, cwd: f.configDir,
        stdin: "pipe", stdout: "pipe", stderr: "pipe" });
      cold.stdin.write(JSON.stringify({ id: 1, op: "toggle", name: "alpha", agent: "codex", enabled: false }) + "\n");
      cold.stdin.end();
      const [stdout, stderr, code] = await Promise.all([
        new Response(cold.stdout).text(), new Response(cold.stderr).text(), cold.exited
      ]);
      const body = JSON.parse(stdout.trim());
      check("one-shot wrapper uses identical native code", code === 0 && body.ok);
      result.timings.push({ kind: "one-shot-native-toggle", plugins,
        wallMs: performance.now() - start, nativeMs: body.ms, stderrBytes: stderr.length });
    } finally { await worker.stop(); }
    untouched();
  }
  const f = fixture("correctness", { hidden: true });
  const worker = new Worker(f);
  try {
    const before = sha(path.join(f.configDir, "library.json"));
    check("invalid path rejected", !(await worker.request({ op: "toggle", name: "../alpha", agent: "codex", enabled: true })).ok &&
      sha(path.join(f.configDir, "library.json")) === before);
    for (const on of [true, false, true]) {
      const response = await worker.request({ op: "toggle", name: "alpha", agent: "codex", enabled: on });
      check("hidden association retained", response.ok && agents(f).includes("hidden-history"));
      if (on) check("native link points at library", fs.realpathSync(link(f)) ===
        fs.realpathSync(path.join(f.configDir, "library", "skills", "alpha")));
    }
    const own = path.join(f.dir, ".codex", "skills", "beta");
    fs.mkdirSync(own, { recursive: true });
    fs.writeFileSync(path.join(own, "SKILL.md"), "# User-owned skill\n");
    const conflict = await worker.request({ op: "toggle", name: "beta", agent: "codex", enabled: true });
    check("native ownership protects user's same-name folder",
      conflict.result?.problems?.some((p) => p.own) &&
      fs.readFileSync(path.join(own, "SKILL.md"), "utf8") === "# User-owned skill\n");
  } finally { await worker.stop(); }
  const off = fixture("off-here", { offHere: true });
  const offWorker = new Worker(off);
  try {
    const response = await offWorker.request({ op: "toggle", name: "alpha", agent: "codex", enabled: true });
    check("native offHere prevents distribution while retaining association",
      response.ok && agents(off).includes("codex") && !fs.existsSync(link(off)));
  } finally { await offWorker.stop(); }
  const race = fixture("cross-process-race");
  const raceWorker = new Worker(race);
  try {
    const call = raceWorker.send({ op: "race-toggle", name: "alpha", agent: "codex", enabled: true }, true);
    await Promise.race([call.barrier, Bun.sleep(15000).then(() => { throw new Error("No barrier"); })]);
    const other = await cli(race, "beta", true);
    const betaBeforeRelease = [...agents(race, "beta")];
    fs.writeFileSync(path.join(race.dir, `release-${call.id}`), "release");
    const completed = await call.done;
    result.crossWriter = {
      helperOK: completed.ok, cliOK: true, cliMs: other.wallMs,
      betaBeforeRelease, betaAfterRelease: agents(race, "beta"),
      alphaAfterRelease: agents(race, "alpha")
    };
    check("controlled overlap reproduces native cross-process lost update",
      completed.ok && betaBeforeRelease.includes("codex") && !agents(race, "beta").includes("codex"),
      result.crossWriter);
  } finally { await raceWorker.stop(); }
  untouched();
} catch (error) {
  result.error = error.stack;
  throw error;
} finally {
  result.liveLibraryUnchanged = liveBefore === sha(`${live}/library.json`);
  result.installedMagpieUnchanged = magpieBefore === sha("E:/magpie-windows-amd64.exe");
  fs.writeFileSync(`${base}/artifacts/results-${run}.json`, JSON.stringify(result, null, 2));
  console.log("RESULT_FILE", `${base}/artifacts/results-${run}.json`);
}
