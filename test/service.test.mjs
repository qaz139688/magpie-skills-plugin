import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { createService } from "../lib/service.mjs";
import { metadataPath } from "../lib/metadata.mjs";
import {
  fakeDiscovery,
  makeRequest,
  readLibrary,
  sessionFor,
  tempConfig,
  updateSkillAgents,
  writeLibrary,
  writeSkill
} from "./helpers.mjs";

function setup() {
  const temp = tempConfig();
  writeLibrary(temp.dir, [
    { name: "alpha", agents: ["codex", "hidden"] },
    { name: "beta", agents: [] }
  ]);
  writeSkill(temp.dir, "alpha", "Alpha skill");
  writeSkill(temp.dir, "beta", "Beta skill");
  const discovery = fakeDiscovery([
    { id: "codex", name: "Codex", initials: "CX" },
    { id: "claude", name: "Claude Code", initials: "CC" }
  ]);
  const calls = [];
  const service = createService({
    configDir: temp.dir,
    env: {},
    now: () => 1_700_000_000_000,
    executable: "C:\\magpie.exe",
    agentDiscovery: discovery,
    setAgents: async ({ skillName, agentIds }) => {
      calls.push({ skillName, agentIds: [...agentIds] });
      updateSkillAgents(temp.dir, skillName, agentIds);
    }
  });
  return { ...temp, discovery, calls, service };
}

describe("skills manager service", () => {
  test("requires a page token and rejects non-loopback origins", async () => {
    const context = setup();
    try {
      const unauthorized = await makeRequest(context.service, {
        path: "/api/state",
        pageToken: "not-a-magpie-page-token"
      });
      expect(unauthorized.response.status).toBe(401);

      const crossOrigin = await makeRequest(context.service, {
        path: "/api/state",
        origin: "https://example.com"
      });
      expect(crossOrigin.response.status).toBe(403);
    } finally {
      context.cleanup();
    }
  });

  test("returns a narrow skills projection and preserves label metadata", async () => {
    const context = setup();
    try {
      const session = await sessionFor(context.service);
      const state = await makeRequest(context.service, { path: "/api/state" });
      expect(state.response.status).toBe(200);
      expect(state.data.skills.map((skill) => skill.name)).toEqual(["alpha", "beta"]);
      expect(state.data.skills[0].description).toBe("Alpha skill");
      expect(state.data.skills[0].source).toBeUndefined();
      expect(state.data.capabilities.canAssign).toBe(true);

      const created = await makeRequest(context.service, {
        path: "/api/labels",
        method: "POST",
        session,
        body: { action: "create", name: "Design" }
      });
      expect(created.response.status).toBe(200);
      const label = created.data.labels[0];
      expect(label.name).toBe("Design");

      const linked = await makeRequest(context.service, {
        path: "/api/skills/alpha/labels",
        method: "POST",
        session,
        body: { labelIds: [label.id] }
      });
      expect(linked.response.status).toBe(200);
      expect(linked.data.skills.find((skill) => skill.name === "alpha").labels).toEqual([
        label.id
      ]);
      expect(linked.data.labels[0].count).toBe(1);
    } finally {
      context.cleanup();
    }
  });

  test("global off and on preserve hidden associations", async () => {
    const context = setup();
    try {
      const session = await sessionFor(context.service);
      const refreshCount = context.discovery.refreshCalls.length;
      const off = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents/all",
        method: "POST",
        session,
        body: { enabled: false }
      });
      expect(off.response.status).toBe(200);
      expect(context.calls.at(-1)).toEqual({
        skillName: "alpha",
        agentIds: ["hidden"]
      });
      expect(
        off.data.skills.find((skill) => skill.name === "alpha").assignedAgents
      ).toEqual(["hidden"]);
      expect(context.discovery.refreshCalls.length).toBe(refreshCount + 1);
      expect(context.discovery.refreshCalls.at(-1)).toEqual({});

      const on = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents/all",
        method: "POST",
        session,
        body: { enabled: true }
      });
      expect(on.response.status).toBe(200);
      expect(context.calls.at(-1)).toEqual({
        skillName: "alpha",
        agentIds: ["claude", "codex", "hidden"]
      });
    } finally {
      context.cleanup();
    }
  });

  test("individual toggles preserve hidden associations", async () => {
    const context = setup();
    try {
      const session = await sessionFor(context.service);
      const off = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents",
        method: "POST",
        session,
        body: { agentId: "codex", enabled: false }
      });
      expect(off.response.status).toBe(200);
      expect(context.calls.at(-1)).toEqual({
        skillName: "alpha",
        agentIds: ["hidden"]
      });

      const on = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents",
        method: "POST",
        session,
        body: { agentId: "claude", enabled: true }
      });
      expect(on.response.status).toBe(200);
      expect(context.calls.at(-1)).toEqual({
        skillName: "alpha",
        agentIds: ["claude", "hidden"]
      });
    } finally {
      context.cleanup();
    }
  });

  test("rejects an agent that is no longer eligible and does not mutate", async () => {
    const context = setup();
    try {
      const session = await sessionFor(context.service);
      const before = readLibrary(context.dir).skills.find((skill) => skill.name === "alpha");
      const result = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents",
        method: "POST",
        session,
        body: { agentId: "hidden", enabled: true }
      });
      expect(result.response.status).toBe(409);
      expect(result.data.error.code).toBe("agent_not_eligible");
      expect(context.calls.length).toBe(0);
      expect(readLibrary(context.dir).skills.find((skill) => skill.name === "alpha").agents).toEqual(
        before.agents
      );
    } finally {
      context.cleanup();
    }
  });

  test("disables writes when no eligible agents are discovered", async () => {
    const context = setup();
    try {
      context.discovery.set({ agents: [] });
      const state = await makeRequest(context.service, { path: "/api/state" });
      expect(state.data.capabilities.canAssign).toBe(false);
      const session = await sessionFor(context.service);
      const result = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents/all",
        method: "POST",
        session,
        body: { enabled: false }
      });
      expect(result.response.status).toBe(409);
      expect(result.data.error.code).toBe("no_eligible_agents");
      expect(context.calls.length).toBe(0);
    } finally {
      context.cleanup();
    }
  });

  test("does not write when cached discovery is in an error state", async () => {
    const context = setup();
    try {
      context.discovery.set({
        state: "error",
        agents: [],
        error: "fixture discovery failed"
      });
      const session = await sessionFor(context.service);
      const result = await makeRequest(context.service, {
        path: "/api/skills/alpha/agents",
        method: "POST",
        session,
        body: { agentId: "codex", enabled: true }
      });
      expect(result.response.status).toBe(503);
      expect(result.data.error.code).toBe("agent_discovery_failed");
      expect(context.calls.length).toBe(0);
    } finally {
      context.cleanup();
    }
  });

  test("shows invalid metadata and never overwrites it", async () => {
    const context = setup();
    try {
      const file = metadataPath(context.dir);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, "{broken", "utf8");
      const state = await makeRequest(context.service, { path: "/api/state" });
      expect(state.data.metadata.state).toBe("error");
      expect(state.data.capabilities.canLabel).toBe(false);

      const session = await sessionFor(context.service);
      const result = await makeRequest(context.service, {
        path: "/api/labels",
        method: "POST",
        session,
        body: { action: "create", name: "Should not save" }
      });
      expect(result.response.status).toBe(500);
      expect(fs.readFileSync(file, "utf8")).toBe("{broken");
    } finally {
      context.cleanup();
    }
  });
});
