import fs from "node:fs";
import path from "node:path";
import { SKILL_NAME_RE } from "./constants.mjs";
import { AppError } from "./errors.mjs";

export function libraryFile(configDir) {
  return path.join(configDir, "library.json");
}

export function librarySkillsDir(configDir) {
  return path.join(configDir, "library", "skills");
}

function sourceLabel(source) {
  if (!source || typeof source !== "object") return "";
  if (source.repo) return source.repo;
  if (source.kind === "folder") return "Local folder";
  if (source.kind === "git") return "Git repository";
  return "";
}

export function loadLibrary(configDir) {
  const file = libraryFile(configDir);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { state: "missing", error: null, skills: [], file };
    }
    throw new AppError(
      "library_read_failed",
      `Could not read Magpie's library: ${error.message}`,
      500
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new AppError(
      "library_invalid",
      `Magpie's library.json is not valid JSON: ${error.message}`,
      500
    );
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.skills)) {
    throw new AppError(
      "library_invalid",
      "Magpie's library.json has no skills array.",
      500
    );
  }

  const seen = new Set();
  const skills = parsed.skills.map((rawSkill) => {
    if (!rawSkill || typeof rawSkill !== "object") {
      throw new AppError("library_invalid", "A library skill entry is not an object.", 500);
    }
    const name = String(rawSkill.name || "").trim();
    if (!SKILL_NAME_RE.test(name)) {
      throw new AppError("library_invalid", `Invalid library skill name: ${name || "(empty)"}.`, 500);
    }
    if (seen.has(name)) {
      throw new AppError("library_invalid", `Duplicate library skill name: ${name}.`, 500);
    }
    seen.add(name);
    const agents = Array.isArray(rawSkill.agents)
      ? rawSkill.agents.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim())
      : [];
    return {
      name,
      agents: [...new Set(agents)].sort(),
      offHere: rawSkill.offHere === true,
      source: rawSkill.source,
      sourceLabel: sourceLabel(rawSkill.source)
    };
  });

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { state: "ok", error: null, skills, file };
}

export function findSkill(library, name) {
  return library.skills.find((skill) => skill.name === name) || null;
}

function unquoteYaml(value) {
  const text = String(value || "").trim();
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    return text.slice(1, -1);
  }
  return text;
}

export function parseSkillDescription(markdown) {
  const text = String(markdown || "").replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return "";
  const end = text.indexOf("\n---", 4);
  if (end < 0) return "";
  const frontMatter = text.slice(4, end);
  const lines = frontMatter.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^description:\s*(.*)$/i);
    if (!match) continue;
    const first = match[1].trim();
    if (/^[|>][-+]?$/.test(first)) {
      const parts = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        const line = lines[next];
        if (/^\S[^:]*:/.test(line)) break;
        if (!/^\s+/.test(line) && line.trim()) break;
        parts.push(line.trim());
      }
      return parts.join(" ").replace(/\s+/g, " ").trim();
    }
    return unquoteYaml(first).replace(/\s+/g, " ").trim();
  }
  return "";
}

export function readSkillDescription(configDir, name) {
  const file = path.join(librarySkillsDir(configDir), name, "SKILL.md");
  try {
    return parseSkillDescription(fs.readFileSync(file, "utf8"));
  } catch {
    return "";
  }
}

export function projectSkills(configDir, library) {
  return library.skills.map((skill) => ({
    name: skill.name,
    description: readSkillDescription(configDir, skill.name),
    assignedAgents: skill.agents,
    offHere: skill.offHere,
    sourceLabel: skill.sourceLabel
  }));
}
