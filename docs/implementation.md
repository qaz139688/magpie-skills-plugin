# Implementation Notes

Date: 2026-10-30 (Asia/Shanghai)
Status: implemented and formally installed in the live Magpie profile; live
page load verified.

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

`magpie ls` is parsed into a fixed display-name catalog for Magpie 0.1.2115.
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

### Authentication

The page sends its Magpie page capability in `X-Magpie-Page`. State-changing
requests also require a short-lived `X-Magpie-Session` token. The service
accepts only loopback Host values and `Origin: null` or no Origin, and exposes
CORS only for a sandboxed Magpie page. Tokens are kept in headers, not URLs.

## Verification completed

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

The plugin is installed in the live Magpie profile. The manager page is
available from **Plugins -> Skills Management**. No skill association or label
was changed during installation verification. Opening the page may trigger a
real Windows agent discovery; assignment writes happen only when a control is
clicked, and every write is still delegated to Magpie's CLI and verified by a
fresh library read.
