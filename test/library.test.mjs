import { describe, expect, test } from "bun:test";
import {
  loadLibrary,
  parseSkillDescription,
  projectSkills
} from "../lib/library.mjs";
import { tempConfig, writeLibrary, writeSkill } from "./helpers.mjs";

describe("library projection", () => {
  test("reads skill names and descriptions without exposing unrelated library data", () => {
    const { dir, cleanup } = tempConfig();
    try {
      writeLibrary(dir, [
        { name: "pdf", agents: ["codex", "hidden"] },
        { name: "plain", agents: [] }
      ]);
      writeSkill(dir, "pdf", "Read PDFs well");
      writeSkill(dir, "plain", "Plain skill");
      const library = loadLibrary(dir);
      const projected = projectSkills(dir, library);
      expect(projected).toEqual([
        {
          name: "pdf",
          description: "Read PDFs well",
          assignedAgents: ["codex", "hidden"],
          offHere: false,
          sourceURL: "",
          sourceOwner: "",
          sourceKind: "unknown",
          sourceLabel: "",
          customSource: false,
          canEditSource: true
        },
        {
          name: "plain",
          description: "Plain skill",
          assignedAgents: [],
          offHere: false,
          sourceURL: "",
          sourceOwner: "",
          sourceKind: "unknown",
          sourceLabel: "",
          customSource: false,
          canEditSource: true
        }
      ]);
      expect(Object.keys(projected[0])).not.toContain("source");
    } finally {
      cleanup();
    }
  });

  test("parses folded frontmatter descriptions", () => {
    expect(
      parseSkillDescription(
        "---\nname: x\ndescription: >-\n  first line\n  second line\nlicense: MIT\n---\n"
      )
    ).toBe("first line second line");
  });
});
