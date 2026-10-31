import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createService } from "../lib/service.mjs";
import {
  createLabel,
  emptyMetadata,
  saveMetadata,
  setSkillLabels
} from "../lib/metadata.mjs";
import {
  fakeDiscovery,
  tempConfig,
  updateSkillAgents,
  writeLibrary,
  writeSkill
} from "./helpers.mjs";
import { emptyFeatures, saveFeatures } from "../lib/features.mjs";
import { addProject, setProjectAgents } from "../lib/projects.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageDir = path.resolve(here, "..", "page");
const token = "a".repeat(32);
const pagePort = 4173;
const apiPort = 4174;
const capability = "a".repeat(64);
const writeDelayMs = Math.max(0, Number(process.env.SM_VISUAL_WRITE_DELAY_MS) || 0);

const temp = tempConfig();
const nativeProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-native-project-"));
writeLibrary(temp.dir, [
  {
    name: "agent-reach",
    agents: ["codex", "opencode", "mimocode", "dsh", "workbuddy"],
    source: { kind: "github", repo: "panniantong/agent-reach", path: "agent_reach/skill" }
  },
  {
    name: "design-taste-frontend",
    agents: ["codex"],
    source: { kind: "github", repo: "Leonxlnx/taste-skill", path: "skills/taste-skill" }
  },
  { name: "pdf", agents: [] },
  {
    name: "read-gzh",
    agents: ["codex"],
    source: { kind: "github", repo: "aster110/mycc", path: ".claude/skills/read-gzh" }
  },
  { name: "legacy-notes", agents: ["codex"], offHere: true },
  { name: "hermes-vps", agents: ["dsh"] }
], {
  projects: [{ dir: nativeProjectDir, skills: { pdf: ["codex"] } }]
});
writeSkill(temp.dir, "agent-reach", "Read and search public content across social platforms and developer sites.");
writeSkill(temp.dir, "design-taste-frontend", "A curated frontend art-direction skill for distinctive, production-grade interfaces.");
writeSkill(temp.dir, "pdf", "Read, split, merge, create, and visually verify PDF files.");
writeSkill(temp.dir, "read-gzh", "Read a WeChat public-account article and summarize it.");
writeSkill(temp.dir, "legacy-notes", "A local skill kept on this computer with a machine-level override.");
writeSkill(temp.dir, "hermes-vps", "Deploy and operate the Hermes agent on an Oracle VPS.");

let metadata = emptyMetadata();
const design = createLabel(metadata, "Design");
metadata = design.data;
const research = createLabel(metadata, "Research");
metadata = research.data;
const ops = createLabel(metadata, "Ops");
metadata = ops.data;
metadata = setSkillLabels(metadata, "design-taste-frontend", [design.label.id]);
metadata = setSkillLabels(metadata, "agent-reach", [research.label.id]);
metadata = setSkillLabels(metadata, "read-gzh", [research.label.id]);
metadata = setSkillLabels(metadata, "hermes-vps", [ops.label.id]);
saveMetadata(temp.dir, metadata);

const visualProjectDir = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-visual-project-"));
const visualFeatures = emptyFeatures();
const visualProject = addProject(
  temp.dir,
  visualFeatures,
  [],
  { dir: visualProjectDir, name: "Visual project" },
  { USERPROFILE: "C:\\Users\\tester" }
);
setProjectAgents(temp.dir, visualFeatures, visualProject, [], "pdf", ["codex"]);
saveFeatures(temp.dir, visualFeatures);

const discovery = fakeDiscovery([
  { id: "codex", name: "Codex", initials: "CX" },
  { id: "claude", name: "Claude Code", initials: "CC" },
  { id: "opencode", name: "OpenCode", initials: "OC" },
  { id: "mimocode", name: "MiMo Code", initials: "MM" },
  { id: "commandcode", name: "Command Code", initials: "CCmd" },
  { id: "devin", name: "Devin", initials: "DE" },
  { id: "kimi", name: "Kimi Code", initials: "KI" },
  { id: "droid", name: "Droid", initials: "DR" },
  { id: "qoder-cn", name: "Qoder CN", initials: "QDC" },
  { id: "grok", name: "Grok Build", initials: "GB" },
  { id: "dsh", name: "DeepSeek Harness", initials: "DS" },
  { id: "workbuddy", name: "WorkBuddy", initials: "WB" }
]);

const service = createService({
  configDir: temp.dir,
  env: {},
  now: () => Date.now(),
  executable: "C:\\magpie.exe",
  pluginDir: path.resolve(here, ".."),
  agentDiscovery: discovery,
  pageCapability: capability,
  syncLibrary: async () => {},
  setAgents: async ({ skillName, agentIds }) => {
    if (writeDelayMs) {
      console.log(`VISUAL_SET_AGENTS=${skillName}:${[...agentIds].sort().join(",")}`);
    }
    if (writeDelayMs) await Bun.sleep(writeDelayMs);
    updateSkillAgents(temp.dir, skillName, agentIds);
  }
});

const bridge = `
(() => {
  const theme = {
    dark: false,
    lang: "zh",
    tokens: {
      bg: "#f5f1e8",
      fg: "#22201c",
      card: "#fffdf8",
      line: "#d7d0c3",
      muted: "#6c665d",
      accent: "#245e9b",
      "accent-soft": "#e4edf7",
      font: '"Segoe UI Variable", "Segoe UI", sans-serif'
    }
  };
  const root = document.documentElement;
  root.dataset.theme = "light";
  root.lang = theme.lang;
  for (const [key, value] of Object.entries(theme.tokens)) {
    root.style.setProperty("--magpie-" + key, value);
  }
  window.magpie = {
    theme,
    service: "http://127.0.0.1:__API_PORT__/",
    ready: Promise.resolve(theme),
    options: { get: async () => ({ port: __API_PORT__ }), set: async (value) => value },
    onTheme() {},
    read: async () => { throw new Error("not used in this harness"); }
  };
})();
`;

const parent = `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f5f1e8}iframe{display:block;width:100%;height:100%;border:0}</style>
</head><body><iframe sandbox="allow-scripts" src="/_magpie/plugin/${token}/boot.html"></iframe></body></html>`;

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const pageServer = Bun.serve({
  hostname: "127.0.0.1",
  port: pagePort,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(parent, { headers: { "Content-Type": types[".html"] } });
    }
    const bridgePath = `/_magpie/plugin/${token}/_magpie/bridge.js`;
    if (url.pathname === bridgePath) {
      return new Response(bridge.replaceAll("__API_PORT__", String(apiServer.port)), {
        headers: { "Content-Type": types[".js"] }
      });
    }
    const capabilityPath = `/_magpie/plugin/${token}/.service-capability-${apiServer.port}.js`;
    if (url.pathname === capabilityPath) {
      return new Response(
        `window.__skillsManagerCapability = ${JSON.stringify(capability)};\n`,
        { headers: { "Content-Type": types[".js"] } }
      );
    }
    const prefix = `/_magpie/plugin/${token}/`;
    if (!url.pathname.startsWith(prefix)) return new Response("not found", { status: 404 });
    const rel = decodeURIComponent(url.pathname.slice(prefix.length));
    const file = path.resolve(pageDir, rel);
    if (!file.startsWith(pageDir + path.sep)) return new Response("not found", { status: 404 });
    try {
      const body = fs.readFileSync(file);
      return new Response(body, {
        headers: { "Content-Type": types[path.extname(file)] || "application/octet-stream" }
      });
    } catch {
      return new Response("not found", { status: 404 });
    }
  }
});

const apiServer = Bun.serve({
  hostname: "127.0.0.1",
  port: apiPort,
  fetch: service.fetch
});

console.log(`VISUAL_HARNESS=http://127.0.0.1:${pageServer.port}/`);
console.log(`SERVICE=http://127.0.0.1:${apiServer.port}/`);
console.log(`CONFIG=${temp.dir}`);

process.on("SIGINT", () => {
  pageServer.stop(true);
  apiServer.stop(true);
  temp.cleanup();
  fs.rmSync(nativeProjectDir, { recursive: true, force: true });
  fs.rmSync(visualProjectDir, { recursive: true, force: true });
  process.exit(0);
});

await new Promise(() => {});
