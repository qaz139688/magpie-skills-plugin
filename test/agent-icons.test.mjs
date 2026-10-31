import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENT_ICONS } from "../lib/agent-icons.mjs";
import { AGENT_CATALOG } from "../lib/constants.mjs";

const pageIcons = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "page",
  "icons"
);

describe("agent artwork", () => {
  test("maps every skill-capable Magpie agent to a shipped icon", () => {
    for (const agent of AGENT_CATALOG.filter((item) => item.skills)) {
      expect(AGENT_ICONS[agent.id]?.file).toBeTruthy();
      expect(fs.existsSync(path.join(pageIcons, AGENT_ICONS[agent.id].file))).toBe(true);
    }
  });
});
