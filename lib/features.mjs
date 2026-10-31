import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { SKILL_NAME_RE } from "./constants.mjs";
import { AppError } from "./errors.mjs";
import { metadataDir } from "./metadata.mjs";
import { validateWebURL } from "./sources.mjs";

export const PROJECT_ID_RE = /^prj_[0-9a-f-]{36}$/;
export const PROJECT_SKILL_DIRS = Object.freeze({
  claude: ".claude/skills",
  codex: ".agents/skills",
  gemini: ".agents/skills",
  opencode: ".agents/skills",
  pi: ".agents/skills",
  cursor: ".agents/skills",
  copilot: ".agents/skills",
  agy: ".agents/skills",
  kimi: ".agents/skills",
  goose: ".agents/skills",
  grok: ".agents/skills",
  droid: ".agents/skills",
  cline: ".agents/skills",
  qoder: ".qoder/skills",
  "qoder-cn": ".qoder/skills",
  codebuddy: ".codebuddy/skills",
  commandcode: ".commandcode/skills"
});

export function emptyFeatures() {
  return { schemaVersion: 1, sources: {}, projects: [] };
}

export function featurePath(configDir) {
  return path.join(metadataDir(configDir), "features.json");
}

export function validateFeatures(value) {
  const invalid = (message) => {
    throw new AppError("invalid_features", message, 500);
  };
  if (
    !value ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.projects) ||
    !value.sources ||
    typeof value.sources !== "object" ||
    Array.isArray(value.sources)
  ) {
    invalid("Skills Manager feature metadata is invalid.");
  }
  if (value.projects.length > 100 || Object.keys(value.sources).length > 2000) {
    invalid("Skills Manager feature metadata is too large.");
  }

  const sources = {};
  for (const [name, url] of Object.entries(value.sources)) {
    if (!SKILL_NAME_RE.test(name)) invalid("Invalid skill in source metadata.");
    const validated = validateWebURL(url);
    if (validated) sources[name] = validated;
  }

  const ids = new Set();
  const roots = new Set();
  const projects = value.projects.map((project) => {
    if (
      !project ||
      !PROJECT_ID_RE.test(project.id || "") ||
      ids.has(project.id) ||
      !path.isAbsolute(project.dir || "") ||
      !path.isAbsolute(project.root || "") ||
      typeof project.name !== "string" ||
      !project.name.trim() ||
      project.name.length > 80 ||
      /[\u0000-\u001f\u007f]/.test(project.name)
    ) {
      invalid("Invalid project metadata.");
    }
    const folded = project.root.toLowerCase();
    if (roots.has(folded)) invalid("Duplicate project root.");
    ids.add(project.id);
    roots.add(folded);

    if (
      !project.assignments ||
      typeof project.assignments !== "object" ||
      Array.isArray(project.assignments)
    ) {
      invalid("Invalid project assignments.");
    }
    const assignments = {};
    for (const [name, agents] of Object.entries(project.assignments)) {
      if (
        !SKILL_NAME_RE.test(name) ||
        !Array.isArray(agents) ||
        agents.some((id) => !Object.hasOwn(PROJECT_SKILL_DIRS, id))
      ) {
        invalid("Invalid project skill or agent.");
      }
      if (agents.length) assignments[name] = [...new Set(agents)].sort();
    }

    if (
      !project.placements ||
      typeof project.placements !== "object" ||
      Array.isArray(project.placements)
    ) {
      invalid("Invalid project placements.");
    }
    const placements = {};
    for (const [relative, placed] of Object.entries(project.placements)) {
      const slash = relative.lastIndexOf("/");
      const parent = slash >= 0 ? relative.slice(0, slash) : "";
      const name = slash >= 0 ? relative.slice(slash + 1) : "";
      if (
        !placed ||
        !SKILL_NAME_RE.test(placed.skill || "") ||
        !Object.values(PROJECT_SKILL_DIRS).includes(parent) ||
        name !== placed.skill ||
        !path.isAbsolute(placed.target || "") ||
        typeof placed.identity !== "string"
      ) {
        invalid("Invalid owned project placement.");
      }
      placements[relative] = {
        skill: placed.skill,
        target: placed.target,
        identity: placed.identity
      };
    }
    return {
      id: project.id,
      name: project.name.trim(),
      dir: project.dir,
      root: project.root,
      createdAt: String(project.createdAt || ""),
      assignments,
      placements
    };
  });
  return { schemaVersion: 1, sources, projects };
}

export function loadFeatures(configDir) {
  const file = featurePath(configDir);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { state: "missing", data: emptyFeatures() };
    throw new AppError("features_read_failed", "Could not read project/source metadata.", 500);
  }
  try {
    return { state: "ok", data: validateFeatures(JSON.parse(raw)) };
  } catch (error) {
    throw new AppError(
      "invalid_features",
      `Project/source metadata is invalid: ${error.message}`,
      500
    );
  }
}

export function saveFeatures(configDir, value) {
  const data = validateFeatures(value);
  const dir = metadataDir(configDir);
  const file = featurePath(configDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const temp = path.join(dir, `.features.${randomUUID()}.tmp`);
  try {
    if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`);
    fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
    fs.renameSync(temp, file);
  } catch (error) {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    throw new AppError(
      "features_write_failed",
      `Could not save project/source metadata: ${error.message}`,
      500
    );
  }
  return data;
}
