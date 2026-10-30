# Personal Magpie Skills Manager

An independent Skills Management page for Magpie. It adds labels, Windows
agent controls, and an all-on/all-off control for each skill without replacing
or modifying Magpie's Library page.

Stage: implemented and formally installed in the user's live Magpie profile on
2026-10-30; the live page load has been verified.

## What it does

- Browses skills by All, Untagged, or one user-defined label.
- Allows multiple labels per skill and searches names and descriptions.
- Shows only installed Windows agents that Magpie can give skills to.
- Keeps per-agent controls and adds all-on/all-off for each skill.
- Preserves hidden associations for uninstalled agents.
- Stores labels in plugin-owned metadata, not in `library.json`.
- Applies assignment changes through Magpie's own CLI and re-reads the
  library to confirm the result.

The original Library remains authoritative for skill content, associations,
shared folders, and synchronization.

## Architecture

```text
Magpie page (sandboxed iframe)
        |
        | page capability + short-lived write session
        v
Plugin-owned Bun service on 127.0.0.1:3487
        |
        +-- read-only library.json projection and SKILL.md descriptions
        +-- Windows agent discovery through `magpie ls`
        +-- plugin-owned label metadata
        +-- assignment writes through `magpie library skill agents`
```

The service binds only to loopback, validates Host and Origin, bounds request
size and write concurrency, and accepts only bounded skill/agent operations.
It never exposes an arbitrary shell endpoint or the whole Magpie library
object.

Magpie's page CSP blocks direct network calls, so `page/boot.html` performs
the supported bootstrap: it reads the Magpie theme and options, then navigates
to the plugin's local service, which serves the full management UI and API.
The page capability travels in the URL fragment and is then sent only in the
`X-Magpie-Page` header for API calls.

## Files

- `index.mjs`: Magpie host entry and loopback service startup.
- `lib/`: metadata, library projection, agent discovery, CLI adapter, and
  authenticated HTTP service.
- `page/`: independent page, styles, client logic, and icon.
- `test/`: unit, HTTP, and isolated visual-harness checks.
- `docs/`: the original design and ADRs, plus implementation notes.

## Development

```powershell
cd E:\AI-Workspace\mycc\2-Projects\P21-magpie-skills-plugin
bun test
```

The current suite covers metadata durability, library projection, agent
parsing, authorization, CORS, global/individual assignment semantics, hidden
association retention, and invalid-metadata preservation.

## Install

Formal installation was completed on 2026-10-30. The local package is
registered in the live Magpie profile, and **Skills Management** appears under
Magpie's Plugins group.

For a new profile or an explicit reinstall, install the local package with:

```powershell
& 'E:\magpie-windows-amd64.exe' plugin add 'E:\AI-Workspace\mycc\2-Projects\P21-magpie-skills-plugin'
```

The default loopback port is `3487`; it can be moved with the plugin's `port`
option if that port is occupied. Installation verification loaded the live page
with 25 skills, 25 untagged skills, and 16 eligible Windows agents. It did not
change any skill association or create a label.

## Known boundaries

- The agent display-name catalog targets Magpie `0.1.2115`. An unknown detected
  agent is reported and is not made eligible.
- Shared-folder skills and a skill's `offHere` override are surfaced as
  limitations; the plugin does not delete agent-owned files to force a switch.
- Cross-writer changes in the original Library remain subject to Magpie's
  complete-list CLI semantics. Every write is serialized within this plugin
  and verified by a fresh read.
