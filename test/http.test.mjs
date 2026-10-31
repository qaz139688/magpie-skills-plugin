import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createService } from "../lib/service.mjs";
import {
  fakeDiscovery,
  makeRequest,
  sessionFor,
  tempConfig,
  writeLibrary,
  writeSkill
} from "./helpers.mjs";

describe("loopback HTTP service", () => {
  test("serves state with CORS for a sandboxed page and handles preflight", async () => {
    const temp = tempConfig();
    writeLibrary(temp.dir, [{ name: "pdf", agents: [] }]);
    writeSkill(temp.dir, "pdf", "PDF skill");
    const service = createService({
      configDir: temp.dir,
      env: {},
      executable: "C:\\magpie.exe",
      agentDiscovery: fakeDiscovery([
        { id: "codex", name: "Codex", initials: "CX" }
      ])
    });
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: service.fetch
    });
    const base = `http://127.0.0.1:${server.port}`;
    try {
      const response = await fetch(`${base}/api/state`, {
        headers: {
          Origin: "null",
          "X-Magpie-Page": service.pageCapability
        }
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("access-control-allow-origin")).toBe("null");
      expect((await response.json()).skills[0].name).toBe("pdf");

      const preflight = await fetch(`${base}/api/labels`, {
        method: "OPTIONS",
        headers: {
          Origin: "null",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type,x-magpie-page,x-magpie-session"
        }
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get("access-control-allow-origin")).toBe("null");
      expect(preflight.headers.get("access-control-allow-methods")).toContain("POST");
    } finally {
      server.stop(true);
      temp.cleanup();
    }
  });

  test("serves the page from the plugin service without the Magpie bridge", async () => {
    const temp = tempConfig();
    const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    writeLibrary(temp.dir, []);
    const service = createService({
      configDir: temp.dir,
      env: {},
      executable: "C:\\magpie.exe",
      pluginDir: projectDir,
      agentDiscovery: fakeDiscovery([])
    });
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: service.fetch
    });
    const base = `http://127.0.0.1:${server.port}`;
    try {
      const response = await fetch(`${base}/`);
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toContain('src="app.js"');
      expect(html).not.toContain("_magpie/bridge.js");
      const script = await fetch(`${base}/app.js`);
      expect(script.status).toBe(200);
      expect(script.headers.get("content-type")).toContain("javascript");

      const maskIcon = await fetch(`${base}/icons/opencode.svg`, {
        headers: { Origin: "null" }
      });
      expect(maskIcon.status).toBe(200);
      expect(maskIcon.headers.get("content-type")).toContain("image/svg+xml");
      expect(maskIcon.headers.get("access-control-allow-origin")).toBe("null");
    } finally {
      server.stop(true);
      temp.cleanup();
    }
  });

  test("requires the exact service capability and routes desktop actions through the host", async () => {
    const temp = tempConfig();
    writeLibrary(temp.dir, [{ name: "pdf", agents: [] }]);
    writeSkill(temp.dir, "pdf", "PDF skill");
    const actions = [];
    const service = createService({
      configDir: temp.dir,
      env: {},
      executable: "C:\\magpie.exe",
      agentDiscovery: fakeDiscovery([{ id: "codex", name: "Codex", initials: "CX" }]),
      pageCapability: "b".repeat(64),
      hostAction: async ({ action, value }) => {
        actions.push({ action, value });
        return { ok: true };
      }
    });
    try {
      const wrong = await makeRequest(service, {
        path: "/api/state",
        pageToken: "a".repeat(64)
      });
      expect(wrong.response.status).toBe(401);

      const session = await sessionFor(service);
      const copy = await makeRequest(service, {
        path: "/api/skills/pdf/copy",
        method: "POST",
        session,
        body: {}
      });
      expect(copy.response.status).toBe(200);
      expect(actions.at(-1)).toEqual({ action: "copy", value: "pdf" });

      const source = await makeRequest(service, {
        path: "/api/skills/pdf/source",
        method: "POST",
        session,
        body: { url: "https://example.com/pdf" }
      });
      expect(source.response.status).toBe(200);
      expect(source.data.skills[0].sourceURL).toBe("https://example.com/pdf");
    } finally {
      temp.cleanup();
    }
  });
});
