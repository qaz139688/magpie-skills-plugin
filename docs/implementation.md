# Implementation Notes

> The experience upgrade is implemented in the workspace and verified in an
> isolated harness. The live Magpie page has not been reloaded with it; see
> [experience-upgrade-plan.md](experience-upgrade-plan.md).
>
> Start with [01-项目定位与范围.md](01-项目定位与范围.md),
> [02-架构与执行说明.md](02-架构与执行说明.md), and
> [03-状态与迭代计划.md](03-状态与迭代计划.md). This file records
> implementation evidence rather than defining the current product scope.

Date: 2026-10-30 (Asia/Shanghai)
Status: the baseline is installed in the live Magpie profile and its original
page load was verified. The current upgrade is implemented and verified in
isolation; live reload with the upgrade is still pending.

## Delivered boundary

The implementation follows the independent-plugin boundary in
[design-spec.md](design-spec.md) and ADR 0005:

- The page is registered through `package.json`'s `magpie.page`.
- There is no `replaces` field.
- No Library source, page, or navigation is patched.
- The plugin owns only labels and its presentation.
- Magpie remains authoritative for skills and agent associations.

## Runtime decisions

### Skills and descriptions

The service reads `library.json` as a narrow projection: skill name, agents,
source label, and `offHere`. It reads only `SKILL.md` frontmatter for the
description. It never returns the whole library object.

### Page bootstrap

Magpie serves plugin pages with `connect-src 'none'`, so the page cannot call
the service directly. `page/boot.html` follows the supported page-service
pattern: it reads the bridge theme, language, tokens and options, then
navigates to the local service. The service serves the complete UI at `/` and
its assets beside it. The Magpie page capability is passed in the URL fragment
and cleared with `history.replaceState` before any API call. API requests carry
it only in the `X-Magpie-Page` header, not in their URLs.

### Windows agent eligibility

`magpie ls` is parsed into a fixed display-name catalog. The local Magpie CLI
reported `0.1.2169` on 2026-10-30; this catalog must be rechecked after future
Magpie upgrades.
The parser excludes WSL rows, `not detected` rows, and `CLI not found` rows.
Only agents with a known user-wide Skills location are eligible. Unknown
detected names produce a warning and are not assignable.

### Labels

Labels live in `skills-manager/metadata.json` under the active Magpie profile.
The schema has stable label IDs, display names, and skill-to-label links.
Writes are atomic, keep a `.bak` copy, and reject invalid metadata instead of
replacing it.

### Assignments

All writes use `magpie library skill agents <name> <ids|none>` with an argument
array, never a shell string. The service:

1. refreshes Windows agent discovery at click time;
2. reads the latest association list;
3. calculates the new set while preserving hidden associations;
4. delegates the complete list to Magpie;
5. reads `library.json` again and verifies the result.

Plugin writes are serialized and bounded. The plugin does not claim
cross-writer atomicity with the original Library.

### Toggle responsiveness

Global skill association writes now use the existing discovery cache instead
of forcing `magpie ls` on every click. The page applies the intended state
immediately and marks the affected Agent as applying. Single-agent intents
are coalesced for 120 ms and, if the user changes the intent during a write,
the final intent is sent after the current request completes.

Global toggles also update their visible target immediately, but remain
single-flight for that skill. Failed writes restore the previous UI state and
surface the error. See ADR 0009.

### Authentication

The page sends its Magpie page capability in `X-Magpie-Page`. State-changing
requests also require a short-lived `X-Magpie-Session` token. The service
accepts only loopback Host values and `Origin: null` or no Origin, and exposes
CORS only for a sandboxed Magpie page. Tokens are kept in headers, not URLs.
Persisted capability and bootstrap files use Windows ACLs restricted to the
current user; startup fails closed if the ACL cannot be applied.

## Verification completed

The following baseline checks were recorded at the original delivery:

- `bun test`: 17 passing tests across 5 files.
- Impeccable mechanical detector: no findings for the page, styles, or client.
- Isolated browser harness: desktop 1440px and narrow 420px rendering checked.
- Browser interaction checks: global on, individual agent toggle, label add,
  label create, label delete, search, and label filtering.
- Page bootstrap check: the Magpie page navigated to `127.0.0.1:3489` and the
  service UI loaded without the Magpie page CSP.
- Isolated Magpie profile: `magpie plugin add <workspace>` recognized the
  package as a page plugin and printed:
  `page Skills Management (reads nothing)`.
- Formal live-profile installation: the workspace package is registered in
  `C:\Users\Cc\.config\magpie\plugins.json`.
- Live sidebar check: **Plugins -> Skills Management** is present in Magpie.
- Live page check: `http://127.0.0.1:3487/` loaded with 25 skills, 25 untagged
  skills, and 16 eligible Windows agents.
- Read-only live-profile check: 25 library skills projected, all 25 with
  `SKILL.md` descriptions, and 16 eligible Windows agents discovered.
- No live assignment was changed during verification.

## Current state

The original plugin is installed in the live Magpie profile. The experience
upgrade is implemented in this workspace and verified in an isolated harness;
the live profile has not been reloaded with the upgrade.

## Experience upgrade implementation

The upgrade adds:

- Magpie agent artwork with image/mask rendering by agent.
- Rounded skill cards, exact-name copy, Library-folder opening, native source
  links, GitHub owner avatars, and custom source URLs.
- A Projects rail. Native project views are read-only; adding a skill through
  a skill's project menu uses the controlled native writer. Plugin projects
  use explicitly owned Windows Junctions and do not change global assignments.
- Native-project removal changes only currently eligible project agents. Hidden
  or unsupported assignments remain intact, and the menu no longer treats a
  hidden-only assignment as active.
- Runtime service capability delivery through a protected bootstrap script.

`features.json` owns custom source URLs and plugin project records. It is
separate from labels and native `library.json`. Project writes reject foreign
folders, overlapping native projects, unsupported agents, redirected paths,
and unverified links.

## Upgrade verification

- `bun test`: 30 passing tests across 9 files after the A+B change.
- `impeccable detect`: no findings for the changed page files.
- Isolated browser harness: desktop card layout, source avatar, custom source,
  copy action, project navigation, native-project read-only view, project
  all-on, project removal, the add-to-project menu, joined-project checkmarks
  and removal, and 420px narrow layout were exercised.
- Copy check: the Windows clipboard contained the exact name `pdf`.
- Project check: project all-on created verified Junctions at
  `.agents/skills/pdf` and `.claude/skills/pdf`; removal left the project
  folder and Library skill intact.
- Native-project check: removing a joined skill removed the eligible project
  agents while preserving a pre-existing hidden assignment.
- Source check: a source click opened the expected GitHub URL in the system
  browser.
- Startup check: the service published a runtime capability file outside
  public static routes; the exact capability authorized state reads.

The live Magpie page has not yet been restarted or verified against the
upgrade. Opening the existing live page before a Magpie/plugin restart may
still show the prior implementation.
