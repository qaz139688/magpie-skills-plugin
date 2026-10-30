import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  createLabel,
  deleteLabel,
  emptyMetadata,
  loadMetadata,
  metadataPath,
  renameLabel,
  saveMetadata,
  setSkillLabels
} from "../lib/metadata.mjs";
import { tempConfig } from "./helpers.mjs";

describe("label metadata", () => {
  test("creates, renames, links, and deletes labels without touching skills", () => {
    let data = emptyMetadata();
    const created = createLabel(data, "  Design  ");
    data = created.data;
    expect(created.label.name).toBe("Design");

    const second = createLabel(data, "Frontend");
    data = second.data;
    data = setSkillLabels(data, "pdf", [created.label.id, second.label.id]);
    expect(data.links.pdf).toEqual([created.label.id, second.label.id].sort());

    const renamed = renameLabel(data, created.label.id, "Visual");
    data = renamed.data;
    expect(data.links.pdf).toContain(created.label.id);

    const deleted = deleteLabel(data, second.label.id);
    data = deleted.data;
    expect(data.labels.map((label) => label.name)).toEqual(["Visual"]);
    expect(data.links.pdf).toEqual([created.label.id]);
  });

  test("rejects duplicate names case-insensitively", () => {
    const data = createLabel(emptyMetadata(), "Design").data;
    expect(() => createLabel(data, " design ")).toThrow("already exists");
  });

  test("writes atomically and keeps the previous file as .bak", () => {
    const { dir, cleanup } = tempConfig();
    try {
      const first = saveMetadata(dir, createLabel(emptyMetadata(), "First").data);
      saveMetadata(dir, createLabel(first, "Second").data);
      const file = metadataPath(dir);
      expect(fs.existsSync(`${file}.bak`)).toBe(true);
      expect(loadMetadata(dir).data.labels.map((label) => label.name)).toEqual([
        "First",
        "Second"
      ]);
    } finally {
      cleanup();
    }
  });

  test("leaves an invalid metadata file intact", () => {
    const { dir, cleanup } = tempConfig();
    try {
      const file = metadataPath(dir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "{not json", "utf8");
      expect(() => loadMetadata(dir)).toThrow();
      expect(fs.readFileSync(file, "utf8")).toBe("{not json");
    } finally {
      cleanup();
    }
  });
});
