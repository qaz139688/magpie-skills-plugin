export const DEFAULT_PORT = 3487;
export const MAX_BODY_BYTES = 64 * 1024;
export const MAX_LABEL_NAME = 40;
export const MAX_LABELS = 100;
export const SESSION_TTL_MS = 5 * 60 * 1000;
export const MAX_SESSIONS = 64;
export const MAX_PENDING_WRITES = 16;
export const DISCOVERY_TIMEOUT_MS = 45_000;
export const WRITE_TIMEOUT_MS = 90_000;

export const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
export const AGENT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}(@wsl:[A-Za-z0-9][A-Za-z0-9._-]{0,63})?$/;
export const LABEL_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const PAGE_TOKEN_RE = /^[0-9a-f]{32}$/i;
export const SESSION_TOKEN_RE = /^[0-9a-f]{64}$/i;

// The names are the first column of `magpie agents` / `magpie ls` for the
// installed Magpie line this plugin targets. Only agents with a user-wide
// Skills location in Magpie's library adapter are eligible.
const AGENT_ROWS = [
  ["claude", "Claude Code", "CC", true],
  ["claude-desktop", "Claude Desktop", "CD", true],
  ["claude-science", "Claude Science", "CS", false],
  ["codex", "Codex", "CX", true],
  ["gemini", "Gemini CLI", "GM", true],
  ["agy", "Antigravity CLI", "AG", true],
  ["opencode", "OpenCode", "OC", true],
  ["openchamber", "OpenChamber", "OCh", false],
  ["mimocode", "MiMo Code", "MM", true],
  ["deveco", "DevEco Code", "DV", true],
  ["pi", "Pi", "PI", true],
  ["stepcode", "StepCode", "SC", false],
  ["mothx", "MothX", "MX", false],
  ["penguin", "PenguinHarness", "PH", false],
  ["aside", "Aside", "AS", false],
  ["omo", "OmO", "OM", true],
  ["prime-agent", "Prime Agent", "PA", false],
  ["goose", "Goose", "GO", true],
  ["cursor", "Cursor CLI", "CU", true],
  ["cursor-private", "Cursor Private Inference", "CPI", false],
  ["zed", "Zed", "ZE", false],
  ["vscode", "VS Code", "VS", false],
  ["vscode-insiders", "VS Code Insiders", "VSI", false],
  ["vscodium", "VSCodium", "VC", false],
  ["zoocode", "Zoo Code", "ZC", false],
  ["copilot-jetbrains", "Copilot (JetBrains)", "CJ", false],
  ["air", "JetBrains Air", "JA", false],
  ["copilot", "Copilot CLI", "CP", true],
  ["crush", "Crush", "CR", true],
  ["dsh", "DeepSeek Harness", "DS", true],
  ["reasonix", "Reasonix Studio", "RX", false],
  ["commandcode", "Command Code", "CCmd", true],
  ["fx", "fx", "FX", true],
  ["omp", "omp", "omp", true],
  ["devin", "Devin", "DE", true],
  ["hermes", "Hermes Agent", "HE", true],
  ["morph", "Mister Morph", "MO", false],
  ["kimi", "Kimi Code", "KI", true],
  ["qwen", "Qwen Code", "QW", false],
  ["muse", "Muse Code", "MU", false],
  ["empryo", "Empryo", "EM", false],
  ["ante", "Ante", "AN", false],
  ["astrbot", "AstrBot", "AB", false],
  ["openclaw", "OpenClaw", "OCl", false],
  ["jcode", "jcode", "JC", false],
  ["minimax-code", "MiniMax Code", "MC", true],
  ["droid", "Droid", "DR", true],
  ["cline", "Cline", "CL", true],
  ["qoder", "Qoder", "QD", true],
  ["qoder-cn", "Qoder CN", "QDC", true],
  ["grok", "Grok Build", "GB", true],
  ["grok-app", "Grok App", "GA", true],
  ["zcode", "ZCode", "Z", true],
  ["workbuddy", "WorkBuddy", "WB", true],
  ["workbuddy-ai", "WorkBuddy AI", "WBA", true],
  ["codebuddy", "CodeBuddy", "CB", true],
  ["pencil", "Pencil", "PE", false],
  ["openpencil", "OpenPencil", "OP", false],
  ["newmax", "NewMax", "NM", false],
  ["raycast", "Raycast", "RA", false],
  ["kiro", "Kiro Crew", "KC", false],
  ["t3code", "T3 Code", "T3", false],
  ["hanako", "OpenHanako", "OH", true],
  ["atomcode", "AtomCode", "AC", true],
  ["snow", "Snow CLI", "SN", false],
  ["alma", "Alma", "AL", true],
  ["cindy", "Cindy", "CI", true],
  ["aionui", "AionUi", "AIU", false],
  ["lody", "Lody", "LO", false]
];

export const AGENT_CATALOG = AGENT_ROWS.map(([id, name, initials, skills]) => ({
  id,
  name,
  initials,
  skills
}));

export const AGENT_BY_NAME = new Map(AGENT_CATALOG.map((agent) => [agent.name, agent]));
export const AGENT_BY_ID = new Map(AGENT_CATALOG.map((agent) => [agent.id, agent]));
export const SKILL_CAPABLE_IDS = new Set(
  AGENT_CATALOG.filter((agent) => agent.skills).map((agent) => agent.id)
);

export function initialsFor(name) {
  const found = AGENT_BY_NAME.get(name);
  if (found) return found.initials;
  const words = String(name || "?")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}
