import { describe, expect, test } from "bun:test";
import { parseAgentList } from "../lib/discovery.mjs";

describe("agent discovery parsing", () => {
  test("keeps installed, skill-capable Windows agents only", () => {
    const text = [
      "  Claude Code                  auto/model  ~\\.claude\\settings.json",
      "  Codex                        auto/model  ~\\.codex\\config.toml",
      "  Pi                           CLI not found  ~\\.pi\\agent\\settings.json",
      "  Claude Code ↔ WSL Ubuntu     opus  \\\\wsl.localhost\\Ubuntu\\home\\me\\.claude\\settings.json",
      "  OpenChamber                  not detected",
      "  Alma                         localhost:23001"
    ].join("\n");
    const result = parseAgentList(text);
    expect(result.agents.map((agent) => agent.id)).toEqual(["claude", "codex", "alma"]);
    expect(result.warnings).toEqual([]);
  });

  test("reports detected agents outside the catalog without exposing them as eligible", () => {
    const result = parseAgentList("  Mystery Agent               running");
    expect(result.agents).toEqual([]);
    expect(result.unmapped).toEqual(["Mystery Agent"]);
    expect(result.warnings[0]).toContain("Mystery Agent");
  });
});
