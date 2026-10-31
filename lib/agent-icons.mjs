// Verified against Magpie e863f520c33972cea0404c4bf87341ea4db9504e.
// The ids follow Magpie's skill-capable agents; its color SVGs and PNGs are
// images, while the other SVGs are masks drawn in the current text color.
const files = {
  claude: "claudecode-color.svg",
  "claude-desktop": "claude-color.svg",
  codex: "codex-color.svg",
  gemini: "geminicli-color.svg",
  agy: "antigravity-color.svg",
  opencode: "opencode.svg",
  mimocode: "mimocode.svg",
  deveco: "deveco-color.svg",
  pi: "pi.svg",
  omo: "omo.svg",
  goose: "goose.svg",
  cursor: "cursor.svg",
  copilot: "githubcopilot.svg",
  crush: "crush.png",
  dsh: "deepseek-color.svg",
  commandcode: "commandcode.svg",
  fx: "fx.svg",
  omp: "omp.svg",
  devin: "devin.svg",
  hermes: "hermes.svg",
  kimi: "kimi.svg",
  "minimax-code": "minimax-color.svg",
  droid: "factory.svg",
  cline: "cline.svg",
  qoder: "qoder.svg",
  "qoder-cn": "qoder.svg",
  grok: "xai.svg",
  "grok-app": "grok.svg",
  zcode: "zcode.png",
  workbuddy: "workbuddy-color.svg",
  "workbuddy-ai": "workbuddy-color.svg",
  codebuddy: "codebuddy-color.svg",
  hanako: "hanako.png",
  atomcode: "atomcode.png",
  alma: "alma.png",
  cindy: "cindy.png"
};

export const AGENT_ICONS = Object.freeze(
  Object.fromEntries(
    Object.entries(files).map(([id, file]) => [
      id,
      { file, mode: file.endsWith(".png") || file.includes("-color") ? "image" : "mask" }
    ])
  )
);
