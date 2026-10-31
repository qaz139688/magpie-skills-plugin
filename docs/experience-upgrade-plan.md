# Skills Manager: Experience Upgrade Plan

Date: 2026-10-30 (Asia/Shanghai)
Status: implemented in the workspace and verified in isolation. The live
Magpie page has not been reloaded with this upgrade; installation/deployment
is still a separate action.

> Document map: start with [01-项目定位与范围.md](01-项目定位与范围.md),
> [02-架构与执行说明.md](02-架构与执行说明.md), and
> [03-状态与迭代计划.md](03-状态与迭代计划.md). This file remains the
> detailed upgrade plan and evidence record.

The earlier design-only phase and cleanup are historical. Ivy subsequently
asked to execute this plan, which authorized the implementation and isolated
verification described below.

## Goal and boundary

Make the existing Skills Management page easier to scan and use, and add
project-specific skill management. Keep the established Magpie visual language,
label behavior, Windows-only agent scope, and independent-plugin boundary.
Do not replace or patch Magpie's Library page.

The requested `grill-with-docs` skill delegates to `grilling` and
`domain-modeling`. Both dependencies were unavailable during the first review
but were supplied in the next turn and read from the Codex skill root.
This continuation follows their design-tree interview and domain-documentation
rules. There is still no Skill invocation tool; no tool invocation is claimed
and no dependency was installed by this session.

## Confirmed request

| Item | Required experience |
| --- | --- |
| 1 | Replace agent initials with the real icons used by Magpie's Library. Keep installed-agent filtering, accessible names, and selected-state feedback. |
| 2 | Present each skill as an individual rounded capsule-style card, rather than a row inside one rectangular list. Keep long names and descriptions readable. |
| 3 | Put a small copy button beside the skill name. Copy the exact name, without adding `$`, and show success or failure. |
| 4 | Put a small folder button beside the name. Open the skill's local Library folder in Windows Explorer. |
| 5 | Put a source line between the name and description. Reuse the known native origin; allow a custom web URL when no official origin is recorded. Clicking opens the system default browser. |
| 6 | Put the GitHub source owner's avatar before the skill name when that owner is known. |
| 7 | Add a Projects section to the left navigation and allow project-specific skill enablement through links, using Magpie's project implementation as the reference. |

Items 1-6 are explicit requirements. For item 7, Ivy's "yes" confirmed additive
availability and Windows directory Junctions on 2026-10-30. The native
integration path remains a factual prerequisite, not a settled capability.

## Card proposal

```text
[source avatar] skill-name  [copy] [open folder]
                owner/repository or custom source URL
                skill description
                labels and their existing edit action
                agent icons and the existing all-on/all-off controls
```

- Preserve the current theme, typography, search, labels, and assignment rules.
- Use separate cards with pronounced rounded corners, not a fixed-height oval
  that clips multi-line content. On narrow screens, move controls below text.
- Copy, folder, and source actions remain usable during agent discovery.
  Assignment actions retain their existing loading and error restrictions.
- Icon-only buttons have tooltips, keyboard focus, and accessible names.
- A missing avatar does not move the title or hide a skill.

### Source rules and assumptions

1. Prefer a trustworthy origin already recorded by Magpie. Do not infer an
   author's identity from a matching skill name.
2. Store any custom URL in plugin-owned metadata. Do not rewrite the native
   origin, `SKILL.md`, or installation/update configuration.
3. Accept only ordinary HTTP/HTTPS web URLs. Reject executable schemes and
   URLs containing credentials.
4. Derive a GitHub avatar from a confirmed GitHub owner. A local or non-GitHub
   source uses a neutral folder/web icon; do not invent a GitHub author.
5. An unknown source still gets its own line and a small Set source action.
6. Default-browser opening is a host-side action. Do not assume `target="_blank"`
   escapes the embedded Magpie page.
7. Reference native agent artwork rather than drawing replacement initials.
   Use the verified resource mappings below, retain required license notices,
   and do not claim the assets have already been copied or rendered.

### Card implementation facts checked

The separate read-only resource investigation confirmed these upstream
examples in `internal/gui/assets/icons/`; each listed asset was actually
visited with a successful HEAD response:

| Agent | Native resource |
| --- | --- |
| Claude Code | `claudecode-color.svg` |
| Codex | `codex-color.svg` |
| Gemini CLI | `geminicli-color.svg` |
| WorkBuddy / WorkBuddy AI | `workbuddy-color.svg` |
| CodeBuddy | `codebuddy-color.svg` |
| Qoder / Qoder CN | `qoder.svg` |
| Droid | `factory.svg` |
| Kimi Code | `kimi.svg` |

The native [icon renderer](https://github.com/yetone/magpie/blob/main/internal/gui/assets/app.js#L329)
uses images for color assets and PNGs, and a foreground-color mask for other
SVGs. Do not synthesize filenames from agent IDs or assume all icons are SVGs.
Serve selected assets from the plugin rather than depending on the desktop
window's relative icon paths. These are upstream resource facts, not proof
of installed-version rendering or a complete inventory of installed agents.

Native [Source definitions](https://github.com/yetone/magpie/blob/main/internal/library/skills.go#L78)
use `kind`, `repo`, `ref`, `path`, and `dir`. The existing plugin drops these
details when projecting a skill for the page, retaining only `sourceLabel`;
that projection must be extended to deliver a validated web source.
Use the native GitHub URL rules, including the source directory when known.
An avatar identifies the repository-owning account, which may be an
organization, not a proven individual author.

The continuation's narrow local read found 27 skills, 21 with explicit GitHub
origins and six without `source`. The first review's 25-skill count is a
different snapshot. Unknown sources may use a neutral icon and custom source
entry; do not add cross-tool provenance scanning merely to populate avatars.

The outer plugin iframe remains `sandbox="allow-scripts"` after navigating
to the local service. Native page capabilities do not include clipboard,
Explorer, or default-browser opening. The minimal controlled path is a
bounded local-service action using the already available Windows user-level
tools: PowerShell 7 for clipboard, Explorer for the known skill folder, and
ShellExecute for a validated web URL. No new runtime or administrator right
is required for that path. Actual actions and page authorization still need
implementation and real-page verification; no clipboard or GUI action was
performed in this review.

## Confirmed project behavior

### Accepted availability model

Keep two independent kinds of assignment:

- Global assignment: the existing per-skill agent selection.
- Project assignment: the selection for one project, skill, and agent.

Editing a project must not change the global assignment or another project's
selection. However, global skills remain available inside projects. Turning a
project's selection off removes only its project link; it is not a per-project
deny rule for a globally enabled skill.

This is additive project enablement, not isolated project profiles. If Ivy
wants each project to contain only its selected skills, stop and redesign the
availability model before implementation. Merely removing a project link
cannot enforce that isolation.

### Accepted Windows link model

Use the same directory-link behavior as the existing Magpie projects, confirmed
by Ivy: Windows directory junctions pointing at the Library's skill
folder, not duplicated skill content.

The read-only inspection found Junction entries in the three existing native
projects. A Junction is not the Windows `SymbolicLink` type. If Ivy requires
literal symbolic links, treat that as a separate constraint; do not enable
Developer Mode, elevate, change system policy, or substitute copies silently.

Upstream also accommodates copies on Windows. A successful configuration
write alone therefore does not prove that the requested link exists. Verify
the actual entry type and target before reporting a project skill as enabled.

### Proposed project interaction

- Show existing native projects without changing or recreating their links.
- Select a project explicitly; do not scan all drives or auto-enroll this
  workspace.
- Show the project name and full folder path, then reuse the skill cards.
- Clearly distinguish project controls from global controls. Filter project
  agents by both Windows installation and known project-skill support.
- Explain when agents share one project skill directory: separate checkmarks
  cannot prevent another agent that reads that directory from seeing a skill.
- Preserve folders and files not owned by the link manager. Removal must not
  delete the original Library skill or replace a conflicting user-owned folder.
- Existing copy-based projects are not automatically converted.

## Technical options

| Criterion | A: reuse native project management | B: plugin-owned project records and links |
| --- | --- | --- |
| Function fit | Best fit for sharing projects with Library and retaining its ownership and sync rules. | Can provide additive project links, but does not inherently share native project state. |
| License | Magpie's fetched root LICENSE is MIT; retain notices for copied code/assets and respect vendor artwork. | No new link-management dependency is required; reused Magpie assets still need attribution. |
| Maintenance | Reuses the upstream owner rather than maintaining a second synchronizer. Recent commit activity was not verified because GitHub's API returned a rate-limit 403. | This plugin must maintain agent-directory mappings, ownership records, and changes across Magpie versions. |
| Safety | Native code records placed entries, refuses foreign folders, checks project roots, and maintains its own `.gitignore` section. A legitimate mutation interface is still required. | Requires equivalent path, conflict, ownership, and shared-directory protection. Overlapping native and plugin ownership is unsafe. |
| Code quality evidence | Inspected `projects.go` and native UI code demonstrate these guards; native project tests were not run in this review. | No implementation or tests exist yet for this option. |
| Adaptation cost | No public project mutation path was found for the current plugin; desktop private routes cannot be treated as ordinary gateway HTTP routes. | Higher implementation/testing cost; cannot silently adopt or overwrite existing native projects. |

Initially prefer A if a legitimate, supported host-side write path can be
verified. The read-only investigation did not find one, so A is not currently
an implementation-ready option. Do not directly rewrite `library.json`,
bypass page authorization, or change Magpie itself to make A work.

Ivy selected B for direct editing of plugin-owned projects. Existing native
projects remain read-only and are not automatically adopted or synchronized.
Keeping all project editing in the native page was considered but would
narrow item 7. See [ADR 0008](adr/0008-plugin-owned-project-management.md).

### Native interface findings

The fresh-context investigation on 2026-10-30 established:

- Installed `0.1.2120` CLI help has no project mutation command.
- Upstream private routes include `/api/library/projects/add`, `/skill`,
  `/copy`, and `/remove`. They are native UI operations, not public plugin
  capabilities.
- The normal desktop API is served through Wails/WebView resource handling.
  `MAGPIE_ADDR` identifies the model gateway, not the desktop Library API.
- The public page reads remain `usage:summary` and `providers:list`.
  The Bun compatibility client's placeholder project methods are not a
  functioning native Projects client.
- Full `magpie web` uses UI login credentials; launching it or borrowing its
  credentials is not an already-authorized plugin integration.
- Native `copy:false` may still copy on Windows if link creation fails.
  It does not implement the confirmed strict Junction/no-copy policy.

Relevant sources actually inspected by the investigator:

- [Private Library routes](https://github.com/yetone/magpie/blob/main/internal/gui/library.go)
- [Desktop resource handler](https://github.com/yetone/magpie/blob/main/internal/gui/app.go)
- [Native API request boundary](https://github.com/yetone/magpie/blob/main/internal/gui/api.go)
- [Bun compatibility client](https://github.com/yetone/magpie/blob/main/internal/plugin/host.js)
- [Host gateway environment](https://github.com/yetone/magpie/blob/main/internal/plugin/host.go)
- [Public page capabilities](https://github.com/yetone/magpie/blob/main/internal/plugin/page.go)
- [Windows directory-link implementation](https://github.com/yetone/magpie/blob/main/internal/library/dirlink_windows.go)
- [Link/copy behavior](https://github.com/yetone/magpie/blob/main/internal/library/skills.go)

The reported upstream snapshot was
`4b4c4a80629787fe7e90c35c54ee202bdceb8ed8`; it is not installed-version runtime
proof. The investigation did not invoke private write routes, obtain full UI
credentials, launch web mode, or mutate existing projects.

### Accepted plugin-project boundaries

- Native project views remain read-only; a skill's project menu may add that
  skill through the controlled native writer. There is no automatic adoption
  or bidirectional synchronization.
- Register local project folders explicitly, and keep the plugin's project
  metadata separate from native `library.json`.
- Do not manage a folder already owned by native project management.
- Create only confirmed project Junctions targeting known Library skills;
  a Junction failure is an error, never a request to copy or elevate.
- Remove only placements proven to belong to this plugin. A conflict or a
  newly overlapping native project stops the operation rather than replacing
  files or assuming ownership.
- Use a bounded, authorized local-service action, not an arbitrary filesystem
  or shell endpoint.

## Design tree and current frontier

| Branch | State | Next prerequisite or decision |
| --- | --- | --- |
| Independent page, Windows scope, labels, global switch | Already established | Preserve existing behavior. |
| Card presentation and utility actions | Explicit request recorded | Verify native artwork and host actions before implementing them. |
| Global versus project availability | Confirmed additive | Do not create per-project deny rules. |
| Windows project placement | Confirmed Junction | Verify entry type and target; do not substitute copies. |
| Native project writer | Bounded membership writer implemented | Only the project `skills` map; backup, atomic write, Magpie sync, and verification are required. |
| Project ownership or native-page handoff | Confirmed plugin-owned projects | Native projects remain read-only, with no automatic adoption or synchronization. |
| Final product scope | Confirmed by Ivy | Keep all seven requested changes in the detailed design. |
| Current phase | Implemented in workspace | Isolated verification passed; live reload/deployment remains separate. |

The active `grilling` skill requires a fresh-context factual investigation
before asking downstream integration questions. That investigation completed
read-only: no native project mutation, global configuration change, or
authentication bypass occurred.

See [ADR 0007](adr/0007-additive-project-skills.md) for the confirmed boundary
and [GLOSSARY.md](../GLOSSARY.md) for canonical domain terms.

## Detailed service and ownership design

This section describes the implemented design; the verification result is
recorded below.

### Page behavior

- Keep the existing theme, typography, label behavior, and search. Each skill
  gets its own rounded card. Keep the source-avatar slot stable when an image
  fails; place controls beneath the text on narrow screens.
- Copy means the exact skill name. Folder means the original local Library
  skill folder, including when viewing a project's selections.
- Native web provenance has priority. A custom source only supplements a
  missing usable web origin and never changes install/update configuration.
- A source avatar identifies a confirmed repository-owning account, which
  may be an organization, not a proven individual author.
- Copy, folder, and web-source actions do not wait for agent discovery.
  Assignment actions retain the existing loading/error restrictions.
- Native projects carry a read-only ownership badge. Plugin projects carry
  their own ownership badge and explicit project controls.
- Registration selects an existing local folder and optional display name,
  initially with no project skills. No drive scan or automatic activation.
- Shared-directory availability is explained separately from selections:
  unselecting one agent cannot hide a skill from another agent reading the
  same physical project directory.

### Data model

| Data | Authority | Proposed persistence |
| --- | --- | --- |
| Skill content and global associations | Magpie | Narrow read projection; existing native CLI for global mutations. |
| Native project selections | Magpie | Read-only project view plus the narrow Add-to-project membership writer; no adoption or bidirectional sync. |
| Labels | Plugin | Keep the existing label metadata schema and behavior. |
| Custom source URLs | Plugin | Validated skill-name-to-URL records, separate from native provenance. |
| Plugin projects | Plugin | Stable ID, display name, selected path, canonical root, and per-skill agent selections. |
| Owned placements | Plugin | Relative path, source target, and identity of the created Junction. |
| Service capability | Plugin runtime | Memory and a protected bootstrap script; never public routes, logs, Git, or query parameters. |

Project/source metadata should have its own versioned file, atomic replacement,
and backup. Invalid data disables its mutations rather than being overwritten
with an empty file; it must not erase labels or native configuration.

### Authorization and desktop actions

The existing syntax-only token check is insufficient for new file and desktop
actions. The proposed service generates an unpredictable runtime capability
and verifies its exact value before every business API, including state reads
and session creation.

The server hook binds loopback, atomically publishes a port-specific capability
script inside its own page directory, and returns. The capability and bootstrap
files are restricted to the current Windows user with an explicit ACL. The
bootstrap reads the script via Magpie's real protected page route, using a
non-secret cache key and bounded startup retries. It then passes the capability
only in the fragment and API headers. The service's public static whitelist
never exposes that script.
Desktop and project writes also require the existing short-lived session.
Missing, forged, and old capabilities fail before any operation.

This delivery design is source-confirmed, not installed-version tested.
The outer iframe stays sandboxed. Desktop actions use installed PowerShell 7,
Explorer, and the Windows default-browser handler with fixed actions and
argument arrays. Requests identify known skills; they do not expose arbitrary
commands, clipboard text, or filesystem operations.

### Proposed API contracts

| Operation | Proposed request | Required outcome |
| --- | --- | --- |
| Read state | `GET /api/state` | Narrow skill, agent, label, source, and project projection. |
| Create write session | `POST /api/session` | Short-lived session bound to the exact service capability. |
| Skill utility action | `POST /api/skills/:name/copy`, `/folder`, `/browse` | Fixed action derived from a known skill, with visible success/failure. |
| Set source | `POST /api/skills/:name/source` | Validate custom URL or remove it; native provenance remains unchanged. |
| Choose folder | `POST /api/projects/choose` | User-selected path or cancellation; no links or registration yet. |
| Register project | `POST /api/projects` | Validated plugin project ID and empty selections. |
| Project association | `POST /api/projects/:id/skills/:name/agents` | Revalidate eligible agent; change only that plugin project. |
| Project all-on/all-off | `POST /api/projects/:id/skills/:name/all` | Change eligible project agents without changing global associations. |
| Remove plugin project | `POST /api/projects/:id/remove` | Remove only its proven owned placements and registration. |

Native project IDs are never general project-edit targets. Their only write
path is the controlled Add-to-project membership writer in
`lib/native-projects.mjs`. URLs accept only credential-free HTTP/HTTPS. Avatar
requests derive solely from validated GitHub account names, with bounded
requests/cache; they are not an arbitrary URL-fetching service.

### Junction invariants and failure states

- Retain and revalidate the canonical project root. Reject drive roots,
  native/agent/system configuration folders, conflicting project ownership,
  and a registered folder that later points somewhere else.
- Derive destinations only from known project-agent directory mappings and
  validated Library skill names. Resolved destinations must stay inside the
  selected project.
- Preserve redirected parent directories and unowned existing placements,
  even when an existing link points at the same source.
- Create and verify Junctions, not copies. A failure is an error, never
  elevation, Developer Mode modification, or copying.
- Keep a shared placement while any project association still needs it.
  Before removing a link, revalidate both its ownership identity and target.
- Persist new placement ownership before reporting success or removing other
  placements. Failures must not orphan new links or display false success.
- Re-read metadata and inspect actual placements. Show missing, replaced,
  inconsistent, or newly native-owned placements explicitly; opening the page
  does not silently repair them.
- Removal never deletes the project folder, original skill, native project,
  or unrelated files. Registration does not automatically edit `.gitignore`
  or global agent folders.

### Execution gate

The earlier design gate was satisfied when Ivy explicitly asked to execute
this plan. Implementation and isolated verification were then performed.
Live installation, a live Magpie reload, and any live change to native
projects remain separate actions and were not performed.

If a future change is requested, verify metadata/ownership first in isolated
folders, then HTTP authorization, real bootstrap, desktop/narrow rendering
and interactions, and only then scoped installation. Existing native projects
are never test targets.

## Cleanup record

With Ivy's explicit cleanup authorization on 2026-10-30:

- Restored `.gitignore`, `lib/constants.mjs`, `lib/library.mjs`, and
  `lib/service.mjs` to their original Git baseline.
- Removed drafts `lib/agent-icons.mjs`, `lib/avatars.mjs`, `lib/features.mjs`,
  `lib/host-actions.mjs`, `lib/projects.mjs`, `lib/sources.mjs`, and
  `lib/windows-actions.ps1`.
- Removed the runtime capability script generated by that draft without
  displaying its secret.
- Retained all design documents; no tests or deployment were run for cleanup.

Frontend changes and upgrade tests were not completed. No native artwork was
installed and no upgrade deployment was performed. The interrupted draft is
not a delivered upgrade. Any later implementation still requires a separate,
explicit instruction.

## Acceptance checks for implementation

| Area | Passing result |
| --- | --- |
| Existing behavior | Search, multiple labels, untagged filtering, hidden associations, and all-on/all-off semantics still work. |
| Cards | Realistic long content, many agents, desktop and narrow layouts remain readable and keyboard-operable. |
| Copy | The actual clipboard contains exactly the skill name; failed copying gives visible feedback. |
| Folder | Explorer opens the correct skill folder; missing folders report an error without opening an unrelated directory. |
| Source | Known and custom URLs open in the Windows default browser, not in the plugin iframe; invalid URLs are rejected. |
| Avatars/icons | Confirmed owners and native agent artwork render; unavailable images have stable, honest placeholders. |
| Project independence | Editing one project leaves global assignments and another project's assignments unchanged. Global availability is explained rather than represented as blocked. |
| Links | The actual link type and resolved target match the confirmed Windows policy; source edits are visible through the link. |
| Ownership | A conflicting user-owned directory is preserved. Disabling removes only an owned link and never the source skill. |
| Agent support | Unsupported or uninstalled project agents cannot be enabled; shared-directory availability is represented honestly. |
| Integration | Project writes use the approved owner/interface and are followed by a fresh state and filesystem check. |
| Live safety | Development uses an isolated project/profile. No live assignments or pre-existing project links change just from opening the page. |

The isolated execution exercised the following checks: 29 tests pass;
desktop and narrow card layouts render; source avatars and custom sources
display; copy writes the exact name to the Windows clipboard; a source link
opens the system browser; project all-on creates verified Junctions; native
projects remain read-only; project removal removes only owned placements;
the native membership menu preserves hidden assignments when removing the
currently eligible agents; and the service capability is published outside
public static routes.
Live Magpie reload, live project mutation, and live installation remain
untested.

## Evidence checked in this review

- Current workspace: `page/app.js`, `lib/library.mjs`, `lib/constants.mjs`,
  `lib/cli.mjs`, `lib/service.mjs`, and current implementation documents.
- Installed console launcher: `magpie.com --version` returned `0.1.2120`.
  `library project --help` printed Library help with no project mutation
  commands; no project mutation was attempted.
- Narrow read of native `library.json`: 25 skills and three projects.
  Source examples include `source.kind = github` and an explicit repository.
- Existing project entries inspected read-only were directory Junctions.
- Official sources actually fetched on 2026-10-30:
  - [Library subsystem documentation](https://github.com/yetone/magpie/blob/main/docs/subsystems/library.md)
  - [Library model](https://github.com/yetone/magpie/blob/main/internal/library/library.go)
  - [Project implementation](https://github.com/yetone/magpie/blob/main/internal/library/projects.go)
  - [Native Library UI](https://github.com/yetone/magpie/blob/main/internal/gui/assets/plugins/library/client.js)
  - [MIT license](https://github.com/yetone/magpie/blob/main/LICENSE)

The fetched `main` branch is mutable and is not pinned to installed
`0.1.2120`. Source observations do not establish installed-version API support.
