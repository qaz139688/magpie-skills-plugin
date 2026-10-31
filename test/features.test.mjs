import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  addProject,
  projectView,
  removeProject,
  setProjectAgents
} from "../lib/projects.mjs";
import { emptyFeatures, loadFeatures, saveFeatures } from "../lib/features.mjs";
import { sourceDetails, validateWebURL } from "../lib/sources.mjs";
import { tempConfig, writeSkill, writeLibrary } from "./helpers.mjs";

function tempProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-project-"));
  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

describe("source projection", () => {
  test("builds the native GitHub URL and source owner", () => {
    const details = sourceDetails({
      kind: "github",
      repo: "panniantong/agent-reach",
      path: "agent_reach/skill"
    });
    expect(details.sourceURL).toBe(
      "https://github.com/panniantong/agent-reach/tree/HEAD/agent_reach/skill"
    );
    expect(details.sourceOwner).toBe("panniantong");
    expect(details.canEditSource).toBe(false);
  });

  test("accepts only credential-free HTTP URLs", () => {
    expect(validateWebURL("https://example.com/docs")).toBe(
      "https://example.com/docs"
    );
    expect(() => validateWebURL("javascript:alert(1)")).toThrow();
    expect(() => validateWebURL("https://user:pass@example.com")).toThrow();
  });
});

describe("plugin project placements", () => {
  test("creates one verified Junction for a shared project directory and removes only owned links", () => {
    const config = tempConfig();
    const project = tempProject();
    try {
      writeLibrary(config.dir, [{ name: "alpha", agents: [] }]);
      writeSkill(config.dir, "alpha", "Alpha");
      const data = emptyFeatures();
      const registered = addProject(
        config.dir,
        data,
        [],
        { dir: project.dir, name: "Demo" },
        { USERPROFILE: "C:\\Users\\tester" }
      );
      setProjectAgents(
        config.dir,
        data,
        registered,
        [],
        "alpha",
        ["codex", "gemini"]
      );
      const relative = ".agents/skills/alpha";
      const entry = path.join(project.dir, ...relative.split("/"));
      expect(fs.lstatSync(entry).isSymbolicLink()).toBe(true);
      expect(Object.keys(registered.placements)).toEqual([relative]);
      expect(registered.assignments.alpha).toEqual(["codex", "gemini"]);

      setProjectAgents(config.dir, data, registered, [], "alpha", ["codex"]);
      expect(fs.lstatSync(entry).isSymbolicLink()).toBe(true);
      expect(registered.assignments.alpha).toEqual(["codex"]);

      setProjectAgents(config.dir, data, registered, [], "alpha", []);
      expect(fs.existsSync(entry)).toBe(false);
      expect(registered.assignments.alpha).toBeUndefined();

      const stored = loadFeatures(config.dir).data;
      expect(stored.projects[0].placements).toEqual({});
      expect(projectView(stored.projects[0], [], { skills: [{ name: "alpha" }] }).warnings).toEqual([]);
      removeProject(config.dir, data, registered, []);
      expect(loadFeatures(config.dir).data.projects).toEqual([]);
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });

  test("does not replace a foreign project folder", () => {
    const config = tempConfig();
    const project = tempProject();
    try {
      writeLibrary(config.dir, [{ name: "alpha", agents: [] }]);
      writeSkill(config.dir, "alpha", "Alpha");
      const foreign = path.join(project.dir, ".agents", "skills", "alpha");
      fs.mkdirSync(foreign, { recursive: true });
      fs.writeFileSync(path.join(foreign, "keep.txt"), "keep", "utf8");
      const data = emptyFeatures();
      const registered = addProject(
        config.dir,
        data,
        [],
        { dir: project.dir, name: "Demo" },
        { USERPROFILE: "C:\\Users\\tester" }
      );
      expect(() =>
        setProjectAgents(config.dir, data, registered, [], "alpha", ["codex"])
      ).toThrow();
      expect(fs.readFileSync(path.join(foreign, "keep.txt"), "utf8")).toBe("keep");
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });

  test("can remove a plugin project after its folder disappears", () => {
    const config = tempConfig();
    const project = tempProject();
    try {
      writeLibrary(config.dir, [{ name: "alpha", agents: [] }]);
      writeSkill(config.dir, "alpha", "Alpha");
      const data = emptyFeatures();
      const registered = addProject(
        config.dir,
        data,
        [],
        { dir: project.dir, name: "Gone" },
        { USERPROFILE: "C:\\Users\\tester" }
      );
      fs.rmSync(project.dir, { recursive: true, force: true });
      removeProject(config.dir, data, registered, []);
      expect(loadFeatures(config.dir).data.projects).toEqual([]);
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });
});
