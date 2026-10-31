import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "./errors.mjs";
import { PROJECT_SKILL_DIRS, saveFeatures } from "./features.mjs";
import { librarySkillsDir } from "./library.mjs";

const folded = (value) => path.resolve(value).toLowerCase();
const contains = (parent, child) =>
  folded(child) === folded(parent) || folded(child).startsWith(`${folded(parent)}${path.sep}`);
const overlaps = (a, b) => contains(a, b) || contains(b, a);

function identity(file) {
  const stat = fs.lstatSync(file, { bigint: true });
  return `${stat.dev}:${stat.ino}:${stat.birthtimeMs}`;
}

function exists(file) {
  try {
    fs.lstatSync(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function canonical(file) {
  try {
    return fs.realpathSync(file);
  } catch {
    return path.resolve(file);
  }
}

export function projectAgents(agents) {
  return agents.filter((agent) => Object.hasOwn(PROJECT_SKILL_DIRS, agent.id));
}

function rejectNative(root, nativeProjects) {
  if (nativeProjects.some((project) => overlaps(root, canonical(project.dir)))) {
    throw new AppError(
      "native_project_conflict",
      "This folder overlaps a Magpie-owned project. Manage it in Library.",
      409
    );
  }
}

function projectRoot(project, nativeProjects) {
  let root;
  try {
    root = fs.realpathSync(project.dir);
  } catch {
    throw new AppError("project_missing", "The project folder no longer exists.", 409);
  }
  if (folded(root) !== folded(project.root)) {
    throw new AppError(
      "project_root_changed",
      "The project folder now points elsewhere. No links were changed.",
      409
    );
  }
  rejectNative(root, nativeProjects);
  return root;
}

function placementPath(root, relative, createParents = false) {
  const target = path.resolve(root, ...relative.split("/"));
  if (!contains(root, target) || folded(root) === folded(target)) {
    throw new AppError(
      "unsafe_project_path",
      "The placement is outside the registered project.",
      409
    );
  }
  let cursor = root;
  for (const part of relative.split("/").slice(0, -1)) {
    cursor = path.join(cursor, part);
    if (exists(cursor)) {
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new AppError(
          "project_path_redirected",
          "A project skill parent is a link or not a folder. It was left untouched.",
          409
        );
      }
    } else if (createParents) {
      fs.mkdirSync(cursor);
    }
  }
  return target;
}

function owned(file, placement) {
  if (!exists(file)) return false;
  return (
    fs.lstatSync(file).isSymbolicLink() &&
    identity(file) === placement.identity &&
    folded(canonical(fs.readlinkSync(file))) === folded(placement.target)
  );
}

function requireOwned(file, placement) {
  if (exists(file) && !owned(file, placement)) {
    throw new AppError(
      "project_link_conflict",
      "A skill placement was replaced or belongs to someone else. It was left untouched.",
      409
    );
  }
}

export function addProject(configDir, data, nativeProjects, { dir, name = "" }, env = process.env) {
  const input = String(dir || "").trim();
  if (!/^[A-Za-z]:[\\/]/.test(input) || input.length > 2048) {
    throw new AppError(
      "invalid_project_path",
      "Choose an existing local Windows folder using its full path.",
      400
    );
  }
  let root;
  try {
    root = fs.realpathSync(input);
    if (!fs.statSync(root).isDirectory()) throw new Error("not a folder");
  } catch {
    throw new AppError("invalid_project_path", "The project folder does not exist.", 400);
  }
  const home = env.USERPROFILE || env.HOME;
  const protectedRoots = [
    configDir,
    env.SystemRoot,
    env.ProgramFiles,
    ...[
      ".agents",
      ".claude",
      ".codex",
      ".config",
      ".workbuddy",
      ".codebuddy",
      ".qoder",
      ".cursor"
    ]
      .map((folder) => home && path.join(home, folder))
  ].filter(Boolean);
  if (
    path.dirname(root) === root ||
    (home && folded(home) === folded(root)) ||
    protectedRoots.some((protectedRoot) => overlaps(root, canonical(protectedRoot)))
  ) {
    throw new AppError(
      "unsafe_project_path",
      "An agent, system, or Magpie configuration folder cannot be a project.",
      409
    );
  }
  rejectNative(root, nativeProjects);
  if (data.projects.some((project) => overlaps(root, project.root))) {
    throw new AppError(
      "duplicate_project",
      "This project overlaps an already registered plugin project.",
      409
    );
  }
  if (data.projects.length >= 100) {
    throw new AppError("project_limit", "At most 100 projects can be registered.", 409);
  }
  const displayName = String(name || path.basename(root)).trim();
  if (
    !displayName ||
    displayName.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(displayName)
  ) {
    throw new AppError("invalid_project_name", "Use a project name of 1 to 80 characters.", 400);
  }
  const project = {
    id: `prj_${randomUUID()}`,
    name: displayName,
    dir: path.resolve(input),
    root,
    createdAt: new Date().toISOString(),
    assignments: {},
    placements: {}
  };
  data.projects.push(project);
  saveFeatures(configDir, data);
  return project;
}

export function setProjectAgents(
  configDir,
  data,
  project,
  nativeProjects,
  skillName,
  agentIds
) {
  const root = projectRoot(project, nativeProjects);
  const target = fs.realpathSync(path.join(librarySkillsDir(configDir), skillName));
  if (!fs.statSync(path.join(target, "SKILL.md")).isFile()) {
    throw new AppError("skill_folder_missing", "The Library skill folder is missing.", 409);
  }
  const next = [...new Set(agentIds)].sort();
  const desired = new Set(next.map((id) => `${PROJECT_SKILL_DIRS[id]}/${skillName}`));
  const removals = Object.entries(project.placements).filter(
    ([relative, placed]) => placed.skill === skillName && !desired.has(relative)
  );
  for (const [relative, placed] of removals) {
    requireOwned(placementPath(root, relative), placed);
  }
  for (const relative of desired) {
    const dest = placementPath(root, relative);
    const previous = project.placements[relative];
    if (previous) requireOwned(dest, previous);
    else if (exists(dest)) {
      throw new AppError(
        "project_link_conflict",
        "This skill already exists in the project and is not owned by this plugin.",
        409
      );
    }
  }

  const created = [];
  try {
    for (const relative of desired) {
      const dest = placementPath(root, relative, true);
      if (exists(dest)) continue;
      fs.symlinkSync(target, dest, "junction");
      const placed = { skill: skillName, target, identity: identity(dest) };
      if (!owned(dest, placed)) throw new Error("Junction verification failed.");
      project.placements[relative] = placed;
      created.push([relative, placed]);
    }
    if (created.length) saveFeatures(configDir, data);
  } catch (error) {
    for (const [relative, placed] of created) {
      const dest = placementPath(root, relative);
      if (owned(dest, placed)) fs.unlinkSync(dest);
      delete project.placements[relative];
    }
    throw new AppError(
      "project_link_failed",
      `Could not create a verified Junction; no copy was made: ${error.message}`,
      409
    );
  }

  for (const [relative, placed] of removals) {
    const dest = placementPath(root, relative);
    requireOwned(dest, placed);
    if (exists(dest)) fs.unlinkSync(dest);
    delete project.placements[relative];
  }
  if (next.length) project.assignments[skillName] = next;
  else delete project.assignments[skillName];
  saveFeatures(configDir, data);
}

export function removeProject(configDir, data, project, nativeProjects) {
  let root;
  try {
    root = projectRoot(project, nativeProjects);
  } catch (error) {
    if (error?.code === "project_missing") {
      data.projects = data.projects.filter((item) => item.id !== project.id);
      saveFeatures(configDir, data);
      return;
    }
    throw error;
  }
  for (const [relative, placed] of Object.entries(project.placements)) {
    requireOwned(placementPath(root, relative), placed);
  }
  for (const [relative, placed] of Object.entries(project.placements)) {
    const dest = placementPath(root, relative);
    requireOwned(dest, placed);
    if (exists(dest)) fs.unlinkSync(dest);
  }
  data.projects = data.projects.filter((item) => item.id !== project.id);
  saveFeatures(configDir, data);
}

export function projectView(project, nativeProjects, library) {
  const warnings = [];
  try {
    const root = projectRoot(project, nativeProjects);
    for (const [relative, placed] of Object.entries(project.placements)) {
      if (!owned(placementPath(root, relative), placed)) {
        warnings.push(`Check placement: ${relative}`);
      }
    }
    const knownSkills = new Set((library?.skills || []).map((skill) => skill.name));
    for (const [skill, ids] of Object.entries(project.assignments)) {
      if (!knownSkills.has(skill)) warnings.push(`Missing skill: ${skill}`);
      for (const relative of new Set(ids.map((id) => `${PROJECT_SKILL_DIRS[id]}/${skill}`))) {
        if (!project.placements[relative]) warnings.push(`Missing placement: ${relative}`);
      }
    }
  } catch (error) {
    warnings.push(error.message);
  }
  return {
    id: project.id,
    name: project.name,
    dir: project.dir,
    origin: "plugin",
    assignments: project.assignments,
    warnings,
    readOnly: warnings.length > 0,
    skillCount: Object.keys(project.assignments).length
  };
}
