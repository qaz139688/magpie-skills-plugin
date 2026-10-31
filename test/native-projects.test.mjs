import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  loadLibrary
} from "../lib/library.mjs";
import { setNativeProjectAgents } from "../lib/native-projects.mjs";
import {
  fakeDiscovery,
  makeRequest,
  readLibrary,
  sessionFor,
  tempConfig,
  writeLibrary,
  writeSkill
} from "./helpers.mjs";
import { createService } from "../lib/service.mjs";

function nativeProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-native-project-"));
  return {
    dir,
    cleanup() {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };
}

describe("native project membership writes", () => {
  test("updates a native project through the controlled writer and keeps a backup", async () => {
    const config = tempConfig();
    const project = nativeProject();
    try {
      writeLibrary(
        config.dir,
        [{ name: "alpha", agents: [] }],
        {
          projects: [
            {
              dir: project.dir,
              skills: { alpha: ["hidden"] },
              placed: [".agents/skills/alpha"]
            }
          ]
        }
      );
      writeSkill(config.dir, "alpha", "Alpha");
      const native = loadLibrary(config.dir).projects[0];
      const syncCalls = [];

      const result = await setNativeProjectAgents({
        configDir: config.dir,
        project: native,
        skillName: "alpha",
        agentIds: ["codex", "hidden"],
        executable: "C:\\magpie.exe",
        env: {},
        syncLibrary: async (call) => {
          syncCalls.push(call);
        }
      });

      expect(syncCalls).toHaveLength(1);
      expect(fs.existsSync(result.backup)).toBe(true);
      expect(readLibrary(config.dir).projects[0].skills.alpha).toEqual([
        "codex",
        "hidden"
      ]);
      expect(readLibrary(config.dir).projects[0].placed).toEqual([
        ".agents/skills/alpha"
      ]);
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });

  test("restores the library when the sync fails", async () => {
    const config = tempConfig();
    const project = nativeProject();
    try {
      writeLibrary(
        config.dir,
        [{ name: "alpha", agents: [] }],
        { projects: [{ dir: project.dir, skills: {} }] }
      );
      writeSkill(config.dir, "alpha", "Alpha");
      const native = loadLibrary(config.dir).projects[0];

      await expect(
        setNativeProjectAgents({
          configDir: config.dir,
          project: native,
          skillName: "alpha",
          agentIds: ["codex"],
          executable: "C:\\magpie.exe",
          env: {},
          syncLibrary: async () => {
            throw new Error("sync failed");
          }
        })
      ).rejects.toMatchObject({ code: "native_project_write_failed" });

      expect(readLibrary(config.dir).projects[0].skills).toEqual({});
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });

  test("the add-to-project service route writes native membership while the project stays read-only", async () => {
    const config = tempConfig();
    const project = nativeProject();
    try {
      writeLibrary(
        config.dir,
        [{ name: "alpha", agents: [] }],
        { projects: [{ dir: project.dir, skills: { alpha: ["hidden"] } }] }
      );
      writeSkill(config.dir, "alpha", "Alpha");
      const native = loadLibrary(config.dir).projects[0];
      const service = createService({
        configDir: config.dir,
        env: {},
        executable: "C:\\magpie.exe",
        agentDiscovery: fakeDiscovery([
          { id: "codex", name: "Codex", initials: "CX" },
          { id: "claude", name: "Claude Code", initials: "CC" }
        ]),
        syncLibrary: async () => {}
      });

      const session = await sessionFor(service);
      const result = await makeRequest(service, {
        path: `/api/projects/${encodeURIComponent(native.id)}/skills/alpha/all`,
        method: "POST",
        session,
        body: { enabled: true }
      });

      expect(result.response.status).toBe(200);
      expect(result.data.projects.find((item) => item.id === native.id).readOnly).toBe(
        true
      );
      expect(readLibrary(config.dir).projects[0].skills.alpha).toEqual([
        "claude",
        "codex",
        "hidden"
      ]);

      const removed = await makeRequest(service, {
        path: `/api/projects/${encodeURIComponent(native.id)}/skills/alpha/all`,
        method: "POST",
        session,
        body: { enabled: false, removeAll: true }
      });
      expect(removed.response.status).toBe(200);
      expect(removed.data.projects.find((item) => item.id === native.id).readOnly).toBe(
        true
      );
      expect(
        removed.data.projects.find((item) => item.id === native.id).assignments.alpha
      ).toEqual(["hidden"]);
      expect(readLibrary(config.dir).projects[0].skills.alpha).toEqual(["hidden"]);
    } finally {
      project.cleanup();
      config.cleanup();
    }
  });
});
