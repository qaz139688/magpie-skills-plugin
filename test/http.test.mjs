import { describe, expect, test } from "bun:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createService } from "../lib/service.mjs";
import {
  fakeDiscovery,
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
          "X-Magpie-Page": "a".repeat(32)
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
    } finally {
      server.stop(true);
      temp.cleanup();
    }
  });
});
