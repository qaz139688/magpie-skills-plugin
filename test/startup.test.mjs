import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startSkillsService } from "../lib/service.mjs";
import { tempConfig, writeLibrary, writeSkill } from "./helpers.mjs";

describe("service startup capability", () => {
  test("publishes an exact runtime capability outside public static routes", async () => {
    const config = tempConfig();
    const plugin = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-plugin-"));
    const page = path.join(plugin, "page");
    fs.mkdirSync(page, { recursive: true });
    writeLibrary(config.dir, [{ name: "pdf", agents: [] }]);
    writeSkill(config.dir, "pdf", "PDF skill");
    const probe = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => new Response("")
    });
    const port = probe.port;
    probe.stop(true);
    let server;
    let capability;
    try {
      server = startSkillsService({
        port,
        configDir: config.dir,
        pluginDir: plugin,
        env: {},
        logger: { error() {} }
      });
      const capabilityFile = path.join(page, `.service-capability-${port}.js`);
      const text = fs.readFileSync(capabilityFile, "utf8");
      const match = text.match(/^window\.__skillsManagerCapability = "([0-9a-f]{64})";/);
      expect(match).not.toBeNull();
      expect(match[1]).toBe(server.service.pageCapability);
      capability = match[1];

      const response = await fetch(`http://127.0.0.1:${port}/api/state`, {
        headers: { "X-Magpie-Page": match[1], Origin: "null" }
      });
      expect(response.status).toBe(200);

      const publicResponse = await fetch(
        `http://127.0.0.1:${port}/.service-capability-${port}.js`
      );
      expect(publicResponse.status).not.toBe(200);

      server.stop();
      server = startSkillsService({
        port,
        configDir: config.dir,
        pluginDir: plugin,
        env: {},
        logger: { error() {} }
      });
      const restarted = fs.readFileSync(capabilityFile, "utf8");
      expect(restarted).toContain(`"${capability}"`);
      expect(server.service.pageCapability).toBe(capability);
    } finally {
      server?.stop();
      fs.rmSync(plugin, { recursive: true, force: true });
      config.cleanup();
    }
  });

  test("keeps the token an already-open page loaded before an upgrade", async () => {
    const config = tempConfig();
    const plugin = fs.mkdtempSync(path.join(os.tmpdir(), "magpie-plugin-"));
    const page = path.join(plugin, "page");
    fs.mkdirSync(page, { recursive: true });
    writeLibrary(config.dir, []);
    const probe = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => new Response("")
    });
    const port = probe.port;
    probe.stop(true);
    const prior = "c".repeat(64);
    fs.writeFileSync(
      path.join(page, `.service-capability-${port}.js`),
      `window.__skillsManagerCapability = "${prior}";\n`,
      "utf8"
    );
    let server;
    try {
      server = startSkillsService({
        port,
        configDir: config.dir,
        pluginDir: plugin,
        env: {},
        logger: { error() {} }
      });
      expect(server.service.pageCapability).toBe(prior);
      const response = await fetch(`http://127.0.0.1:${port}/api/state`, {
        headers: { "X-Magpie-Page": prior, Origin: "null" }
      });
      expect(response.status).toBe(200);
    } finally {
      server?.stop();
      fs.rmSync(plugin, { recursive: true, force: true });
      config.cleanup();
    }
  });
});
