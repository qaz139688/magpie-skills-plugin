import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  LABEL_ID_RE,
  MAX_LABEL_NAME,
  MAX_LABELS
} from "./constants.mjs";
import { AppError } from "./errors.mjs";

export const METADATA_SCHEMA_VERSION = 1;

export function metadataDir(configDir) {
  return path.join(configDir, "skills-manager");
}

export function metadataPath(configDir) {
  return path.join(metadataDir(configDir), "metadata.json");
}

export function emptyMetadata() {
  return {
    schemaVersion: METADATA_SCHEMA_VERSION,
    labels: [],
    links: {}
  };
}

function normalizeName(value) {
  return String(value || "").trim();
}

function foldedName(value) {
  return normalizeName(value).toLocaleLowerCase();
}

function validateLabelName(name) {
  const trimmed = normalizeName(name);
  if (!trimmed) {
    throw new AppError("invalid_label_name", "Label name cannot be empty.", 400);
  }
  if (trimmed.length > MAX_LABEL_NAME) {
    throw new AppError(
      "invalid_label_name",
      `Label name must be ${MAX_LABEL_NAME} characters or fewer.`,
      400
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) {
    throw new AppError(
      "invalid_label_name",
      "Label name cannot contain control characters.",
      400
    );
  }
  return trimmed;
}

export function validateMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("invalid_metadata", "Metadata must be a JSON object.", 500);
  }
  if (value.schemaVersion !== METADATA_SCHEMA_VERSION) {
    throw new AppError(
      "invalid_metadata",
      `Unsupported metadata schema version: ${String(value.schemaVersion)}.`,
      500
    );
  }
  if (!Array.isArray(value.labels)) {
    throw new AppError("invalid_metadata", "Metadata labels must be an array.", 500);
  }
  if (!value.links || typeof value.links !== "object" || Array.isArray(value.links)) {
    throw new AppError("invalid_metadata", "Metadata links must be an object.", 500);
  }
  if (value.labels.length > MAX_LABELS) {
    throw new AppError(
      "invalid_metadata",
      `Metadata has more than ${MAX_LABELS} labels.`,
      500
    );
  }

  const ids = new Set();
  const names = new Set();
  const labels = value.labels.map((label) => {
    if (!label || typeof label !== "object" || Array.isArray(label)) {
      throw new AppError("invalid_metadata", "Every label must be an object.", 500);
    }
    const id = String(label.id || "").trim();
    if (!LABEL_ID_RE.test(id)) {
      throw new AppError("invalid_metadata", `Invalid label id: ${id || "(empty)"}.`, 500);
    }
    if (ids.has(id)) {
      throw new AppError("invalid_metadata", `Duplicate label id: ${id}.`, 500);
    }
    const name = validateLabelName(label.name);
    const folded = foldedName(name);
    if (names.has(folded)) {
      throw new AppError("invalid_metadata", `Duplicate label name: ${name}.`, 500);
    }
    ids.add(id);
    names.add(folded);
    return {
      id,
      name,
      createdAt: typeof label.createdAt === "string" ? label.createdAt : ""
    };
  });

  const links = {};
  for (const [skillName, labelIds] of Object.entries(value.links)) {
    if (!Array.isArray(labelIds)) {
      throw new AppError(
        "invalid_metadata",
        `Labels for ${skillName} must be an array.`,
        500
      );
    }
    const unique = [];
    for (const rawId of labelIds) {
      const id = String(rawId || "").trim();
      if (!ids.has(id)) {
        throw new AppError(
          "invalid_metadata",
          `Metadata links ${skillName} to unknown label ${id || "(empty)"}.`,
          500
        );
      }
      if (!unique.includes(id)) unique.push(id);
    }
    if (unique.length) links[skillName] = unique.sort();
  }

  return {
    schemaVersion: METADATA_SCHEMA_VERSION,
    labels,
    links
  };
}

export function loadMetadata(configDir) {
  const file = metadataPath(configDir);
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { data: emptyMetadata(), state: "missing", error: null, path: file };
    }
    throw new AppError(
      "metadata_read_failed",
      `Could not read Skills Manager metadata: ${error.message}`,
      500
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new AppError(
      "invalid_metadata",
      `Skills Manager metadata is not valid JSON: ${error.message}`,
      500
    );
  }
  return { data: validateMetadata(parsed), state: "ok", error: null, path: file };
}

export function saveMetadata(configDir, value) {
  const data = validateMetadata(value);
  const dir = metadataDir(configDir);
  const file = metadataPath(configDir);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak`);
  }

  const temp = path.join(
    dir,
    `.metadata.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  );
  const text = `${JSON.stringify(data, null, 2)}\n`;
  try {
    fs.writeFileSync(temp, text, { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temp, file);
  } catch (error) {
    try {
      fs.rmSync(temp, { force: true });
    } catch {
      // The original file is left untouched.
    }
    throw new AppError(
      "metadata_write_failed",
      `Could not save Skills Manager metadata: ${error.message}`,
      500
    );
  }
  return data;
}

export function createLabel(value, name, now = new Date()) {
  const data = validateMetadata(value);
  if (data.labels.length >= MAX_LABELS) {
    throw new AppError(
      "label_limit_reached",
      `You can create at most ${MAX_LABELS} labels.`,
      409
    );
  }
  const clean = validateLabelName(name);
  const folded = foldedName(clean);
  if (data.labels.some((label) => foldedName(label.name) === folded)) {
    throw new AppError("duplicate_label", `A label named ${clean} already exists.`, 409);
  }
  const label = {
    id: `lbl_${randomUUID()}`,
    name: clean,
    createdAt: now.toISOString()
  };
  data.labels.push(label);
  return { data, label };
}

export function renameLabel(value, id, name) {
  const data = validateMetadata(value);
  const label = data.labels.find((item) => item.id === id);
  if (!label) {
    throw new AppError("label_not_found", "That label no longer exists.", 404);
  }
  const clean = validateLabelName(name);
  const folded = foldedName(clean);
  if (
    data.labels.some(
      (item) => item.id !== id && foldedName(item.name) === folded
    )
  ) {
    throw new AppError("duplicate_label", `A label named ${clean} already exists.`, 409);
  }
  label.name = clean;
  return { data, label };
}

export function deleteLabel(value, id) {
  const data = validateMetadata(value);
  const index = data.labels.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new AppError("label_not_found", "That label no longer exists.", 404);
  }
  const [removed] = data.labels.splice(index, 1);
  for (const [skillName, ids] of Object.entries(data.links)) {
    const next = ids.filter((labelId) => labelId !== id);
    if (next.length) data.links[skillName] = next;
    else delete data.links[skillName];
  }
  return { data, label: removed };
}

export function setSkillLabels(value, skillName, labelIds) {
  const data = validateMetadata(value);
  const known = new Set(data.labels.map((label) => label.id));
  const unique = [];
  for (const rawId of Array.isArray(labelIds) ? labelIds : []) {
    const id = String(rawId || "").trim();
    if (!known.has(id)) {
      throw new AppError("label_not_found", "One of those labels no longer exists.", 409);
    }
    if (!unique.includes(id)) unique.push(id);
  }
  if (unique.length) data.links[skillName] = unique.sort();
  else delete data.links[skillName];
  return data;
}

export function labelsForSkill(metadata, skillName) {
  return Array.isArray(metadata.links[skillName]) ? metadata.links[skillName] : [];
}

export function labelsWithCounts(metadata, existingSkillNames) {
  const existing = new Set(existingSkillNames);
  const counts = new Map();
  for (const [skillName, ids] of Object.entries(metadata.links)) {
    if (!existing.has(skillName)) continue;
    for (const id of ids) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return metadata.labels.map((label) => ({
    ...label,
    count: counts.get(label.id) || 0
  }));
}
