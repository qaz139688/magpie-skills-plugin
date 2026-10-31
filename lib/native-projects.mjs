import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { SKILL_NAME_RE, WRITE_TIMEOUT_MS } from "./constants.mjs";
import { AppError } from "./errors.mjs";
import { PROJECT_SKILL_DIRS } from "./features.mjs";
import { libraryFile, loadLibrary } from "./library.mjs";
import { metadataDir } from "./metadata.mjs";

const folded = (value) => path.resolve(String(value || "")).toLowerCase();

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function readRawLibrary(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new AppError(
      "library_read_failed",
      `Could not read Magpie's library before changing the project: ${error.message}`,
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
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.projects)) {
    throw new AppError(
      "library_invalid",
      "Magpie's library.json has no projects array.",
      500
    );
  }
  return { raw, parsed };
}

function atomicWrite(file, text) {
  const temp = path.join(path.dirname(file), `.library.${randomUUID()}.tmp`);
  try {
    fs.writeFileSync(temp, text, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (error) {
    if (fs.existsSync(temp)) {
      try {
        fs.unlinkSync(temp);
      } catch {
        // Leave a failed temporary file alone rather than hiding the original error.
      }
    }
    throw new AppError(
      "native_project_write_failed",
      `Could not write Magpie's library atomically: ${error.message}`,
      500
    );
  }
}

function backupLibrary(configDir, raw) {
  const dir = path.join(metadataDir(configDir), "backups");
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(
    dir,
    `library-${stamp}-${randomUUID().slice(0, 8)}.json`
  );
  try {
    fs.writeFileSync(file, raw, { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    throw new AppError(
      "native_project_backup_failed",
      `Could not back up Magpie's library before changing the project: ${error.message}`,
      500
    );
  }

  // Keep the rollback copies bounded. Only files this writer creates are
  // touched; Magpie's own backup folders are left alone.
  try {
    const files = fs
      .readdirSync(dir)
      .filter((name) => /^library-.*\.json$/i.test(name))
      .map((name) => {
        const full = path.join(dir, name);
        return { full, at: fs.statSync(full).mtimeMs };
      })
      .sort((a, b) => b.at - a.at);
    for (const entry of files.slice(20)) fs.unlinkSync(entry.full);
  } catch {
    // Backup pruning is housekeeping; it must not undo a successful write.
  }
  return file;
}

function projectRecord(parsed, project) {
  const wanted = folded(project?.dir);
  return parsed.projects.find(
    (item) => item && typeof item.dir === "string" && folded(item.dir) === wanted
  );
}

function validateAgents(agentIds, existing = []) {
  const ids = [...new Set(Array.isArray(agentIds) ? agentIds : [])].sort();
  const allowed = new Set([...Object.keys(PROJECT_SKILL_DIRS), ...existing]);
  for (const id of ids) {
    if (!allowed.has(id)) {
      throw new AppError(
        "agent_not_eligible",
        `That agent cannot manage project skills: ${id}.`,
        409
      );
    }
  }
  return ids;
}

function nativeProjectView(library, project) {
  return library.projects.find(
    (item) => item.id === project.id || folded(item.dir) === folded(project.dir)
  );
}

export async function setNativeProjectAgents({
  configDir,
  project,
  skillName,
  agentIds,
  executable,
  env = process.env,
  syncLibrary
}) {
  if (!SKILL_NAME_RE.test(skillName)) {
    throw new AppError("invalid_skill", "Invalid skill name.", 400);
  }
  if (!project || typeof project.dir !== "string" || !path.isAbsolute(project.dir)) {
    throw new AppError("project_not_found", "That native project was not found.", 404);
  }
  if (typeof syncLibrary !== "function") {
    throw new AppError(
      "magpie_sync_unavailable",
      "Magpie's library sync is unavailable.",
      503
    );
  }

  const file = libraryFile(configDir);
  const lockFile = path.join(metadataDir(configDir), "native-project-write.lock");
  fs.mkdirSync(path.dirname(lockFile), { recursive: true, mode: 0o700 });

  let lock;
  try {
    lock = fs.openSync(lockFile, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new AppError(
        "native_project_busy",
        "Another native project change is still running. Try again in a moment.",
        409
      );
    }
    throw new AppError(
      "native_project_lock_failed",
      `Could not lock Magpie's project data: ${error.message}`,
      500
    );
  }

  try {
    const { raw, parsed } = readRawLibrary(file);
    const record = projectRecord(parsed, project);
    if (!record) {
      throw new AppError("project_not_found", "That native project was not found.", 404);
    }

    const skills =
      record.skills && typeof record.skills === "object" && !Array.isArray(record.skills)
        ? record.skills
        : {};
    const currentAgents = Array.isArray(skills[skillName])
      ? skills[skillName].filter((id) => typeof id === "string")
      : [];
    const next = validateAgents(agentIds, currentAgents);
    record.skills = skills;
    if (next.length) skills[skillName] = next;
    else delete skills[skillName];

    const updated = `${JSON.stringify(parsed, null, 2)}\n`;
    const current = fs.readFileSync(file, "utf8");
    if (current !== raw) {
      throw new AppError(
        "native_project_changed",
        "Magpie's library changed while the project was being updated. Nothing was written.",
        409
      );
    }
    const backup = backupLibrary(configDir, raw);
    atomicWrite(file, updated);

    try {
      await syncLibrary({
        executable,
        cwd: configDir,
        env,
        timeoutMs: WRITE_TIMEOUT_MS
      });
      const after = loadLibrary(configDir);
      const updatedProject = nativeProjectView(after, project);
      const actual = new Set(updatedProject?.assignments?.[skillName] || []);
      if (!updatedProject || !sameSet(actual, new Set(next))) {
        throw new AppError(
          "native_project_verification_failed",
          "Magpie did not confirm the project assignment after syncing.",
          502
        );
      }
      return { backup };
    } catch (error) {
      atomicWrite(file, raw);
      try {
        await syncLibrary({
          executable,
          cwd: configDir,
          env,
          timeoutMs: WRITE_TIMEOUT_MS
        });
      } catch {
        // The config is restored even when the follow-up sync cannot run.
      }
      throw new AppError(
        "native_project_write_failed",
        `Magpie could not apply the project change; the library was restored: ${error.message}`,
        502,
        { backup, rolledBack: true }
      );
    }
  } finally {
    try {
      fs.closeSync(lock);
    } catch {
      // The process may have closed it already.
    }
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // A stale lock is harmless after the write finishes.
    }
  }
}
