# Personal Magpie Skills Manager: Discovery

Date: 2026-10-29 (Asia/Shanghai)
Status: DESIGN ONLY. Requirements confirmed; further implementation and execution are not requested.

> Implementation status (2026-10-30): the plugin has been implemented and
> verified in isolation. The design-only wording below is retained as
> historical context; see [implementation.md](implementation.md).

## Requested outcomes

1. Assign labels to skills and browse skills by label/group.
2. Skill enable/disable controls show only agents installed locally.
   Uninstalled agents must not have icons in the normal skill controls.
   "Locally" means the current Windows installation, excluding WSL agents.
3. Build on Magpie's existing skills management rather than replace its
   installation and synchronization engine.
4. Add a global switch in addition to the existing per-agent controls.
   For the skill being controlled, on assigns every currently discovered,
   installed, skill-capable Windows agent; off unassigns all those agents.
   It does not remember or restore previous custom per-agent selections.
5. Install as a separate "Skills Management" plugin page under Magpie's
   Extensions/Plugins section. Do not replace Library or modify its code.

## Confirmed decisions

- 2026-10-29: The user confirmed that a skill may have multiple labels.
  It can appear when browsing each of its labels; labels are not exclusive
  folder placement. See ADR 0002.
- 2026-10-29: The user confirmed that only agents installed in the current
  Windows environment are managed. WSL agents are out of scope. See ADR 0003.
- 2026-10-29: The user approved retaining historical skill associations for
  uninstalled agents while hiding their icons. No automatic association
  cleanup is requested. See ADR 0003.
- 2026-10-29: The user requested an additional global switch rather than
  limiting the UI to per-agent controls, and clarified all-on/all-off behavior
  for currently discovered agents. No custom selection snapshot or restoration
  is wanted. The previously confirmed Windows-only scope and retention of
  uninstalled agents' associations still apply. See ADR 0004.
- 2026-10-29: The user confirmed a separate Skills Management page under
  Extensions, explicitly forbidding changes to the existing Library code.
  The plugin must not replace the Library page. See ADR 0005.
- 2026-10-29: The user accepted a plugin-owned service listening only on
  127.0.0.1 and reusing Magpie's management interfaces.
- 2026-10-29: The user subsequently limited this stage to detailed design.
  Do not write implementation code, run compatibility tasks, or install the
  plugin. The already-started isolated diagnostic process was stopped.
  The full design is in design-spec.md.

## Verified locally

- Workspace was empty at the start and is not a Git repository.
- `E:\magpie-windows-amd64.exe --version` reports `magpie 0.1.2012`.
- CLI help exposes `magpie library skill agents <name> <a,b...|none>`.
- CLI help separately exposes `skill off-here` and `skill on-here`.
  Agent assignment and machine-local disable are different operations.
- A scratch diagnostic registration returned an independent page URL and
  service metadata in an isolated profile. This is NOT a functional pass:
  browser rendering, Skills operations and lifecycle were not verified.
  The diagnostic was stopped when the user requested design-only work.
- The local library has 25 skill entries. Its top-level fields do not currently
  include `skillGroups`. This does not prove the application lacks group support.
- The supplied `grill-with-docs/SKILL.md` requests the `grilling` and
  `domain-modeling` skills. Neither dependency was found in the local Magpie,
  Codex or .agents skill roots, and this session has no Skill invocation tool.
  We are using an explicit interview and ADR/glossary documents as a fallback;
  the two dependencies were not invoked or installed.
- The memory-referenced global `C:\Users\Cc\.codex\AGENTS.md` was not
  present when checked. No contents were assumed from memory.

## Verified in public documentation / upstream main

These are upstream observations, NOT runtime proof for local version 0.1.2012.

| Observation | Implication |
| --- | --- |
| `magpie.page` registers a page; `replaces: "library"` can replace Library navigation. | A plugin can own a UI entry, but replacement does not grant Library API permissions or embed the existing page. |
| Public page reads are `usage:summary` and `providers:list`. | No documented page bridge for listing skills, detecting agents, or changing assignments. |
| Pages are sandboxed with `connect-src 'none'`; framed Magpie API requests are rejected. | Do not assume a page can fetch Magpie's private `/api/library` endpoints. |
| Upstream defines `magpie.page.service` and `magpie.service` for a plugin-owned local service. | A hosted service is a candidate integration path; compatibility and lifecycle must be tested on the installed version. |
| `Library` has `SkillGroups`, and the built-in UI also groups by source repository. | Investigate existing group semantics before adding a parallel label system. |
| Upstream `GroupSkills` explicitly removes a skill from other groups, allowing at most one group per skill. | Built-in exclusive groups cannot directly implement the accepted multiple-label model. Independent plugin metadata is proposed. |
| `shownAgents` filters `gone` agents, but `withGone` adds back agents with existing assignments. | Upstream intentionally exposes some uninstalled agents for cleanup. The requested normal UI is stricter. |
| Agent detection includes CLI checks, desktop apps, shared folders and WSL targets. | A directory-exists test alone is insufficient. The confirmed Windows-only scope must filter out WSL targets. |
| Skill synchronization preserves ownership, backups and shared skill-folder semantics. | Delegate assignment mutations to Magpie, not direct filesystem edits. |

## Proposed minimal boundary

- A personal Skills page with label-based browsing and installed-agent controls.
- Magpie remains authoritative for skill content and assignment state.
- Labels do not modify `SKILL.md` or move skill folders.
- Do not silently delete assignments for agents merely hidden from the UI.
- Hidden assignments should survive an unrelated visible-agent toggle.
- This stage is documentation only. Do not run further probes, start services,
  implement the plugin, upgrade runtimes, build source, install into the formal
  profile or change live assignments.
- Keep the existing Library code, page and navigation untouched.
- Register only a separate plugin page via `magpie.page`; do not specify
  `replaces: "library"` or inject controls into the built-in page.

## Future technical validation (not to execute in this stage)

- Confirm independent page registration and host/service lifecycle on 0.1.2012.
- Find a safe Skills and detected-agent read path for the plugin backend.
- Confirm existing group cardinality before choosing label persistence.
- Verify assignment behavior in a sandbox, including hidden associations.

Optional enhancement, not required for the first version: manually hiding
an installed agent the user does not use.

## Draft acceptance checks

- Label filtering never changes skill content or assignments.
- A skill with two labels appears when browsing either label individually.
- Untagged skills remain discoverable.
- Normal controls contain only detected, in-scope agents that support skills.
- WSL and remote agents do not appear in normal controls or become new
  assignment targets. Out-of-scope assignment cleanup is a separate decision.
- Hiding an uninstalled agent preserves its historical skill associations;
  reinstallation makes them eligible for display again after detection.
- A missing/unsupported agent cannot be enabled through a stale UI request.
- Changing one visible agent preserves unrelated and hidden assignments.
- Global on selects every currently eligible Windows agent for the skill;
  global off clears those agents. Neither operation saves or restores the
  earlier custom selection. Hidden historical associations remain intact.
- With no eligible agents, global controls cannot change assignments.
- Shared skill folders are represented honestly; do not promise independent
  disabling where an agent reads a shared folder itself.
- A failed assignment change is visible and followed by a fresh state read.
- Disabling/removing the UI plugin leaves existing skills and links intact.
- Installation exposes a separate Skills Management entry in Extensions.
- The original Library remains available and its code is unchanged.

## Sources

- https://usemagpie.ai/docs/zh/plugins#pages
- https://usemagpie.ai/docs/zh/plugins#replaces
- https://github.com/yetone/magpie/blob/main/internal/plugin/page.go
- https://github.com/yetone/magpie/blob/main/internal/gui/pagebridge.js
- https://github.com/yetone/magpie/blob/main/docs/subsystems/plugin-runtime.md
- https://github.com/yetone/magpie/blob/main/docs/subsystems/library.md
- https://github.com/yetone/magpie/blob/main/internal/library/library.go
- https://github.com/yetone/magpie/blob/main/internal/library/skill_groups.go
- https://github.com/yetone/magpie/blob/main/internal/gui/assets/plugins/library/client.js

Public source inspection date: 2026-10-29. `main` is mutable.
