# ADR 0001: Reuse Magpie's Skill Management

Date: 2026-10-29
Status: accepted architecture; design-only stage, installed-version compatibility pending.

> Follow-up (2026-10-30): the plugin was implemented, installed in the live
> Magpie profile, and verified to load. The design-only constraints below
> record the original decision context; see
> [implementation.md](../implementation.md) for the delivery record.

## Context

The user wants label-based skill browsing and controls limited to local,
installed agents. Magpie already manages skill content, associations,
link/copy synchronization, ownership and backups.

Public plugin pages can replace Library navigation but cannot directly read or
mutate Library through the currently documented bridge. Upstream has a
plugin-owned local service mechanism; installed-version support is unverified.

## Decision

Keep Magpie as the only authority for skill content and agent associations.
The personal extension owns presentation and, only if required, label metadata.

Do not write `library.json` directly or duplicate Magpie's synchronization.
Do not bypass the page sandbox to access private APIs.

The user accepted a plugin page backed by a plugin-owned loopback
service. It would expose a narrow skills-only API and delegate assignments to
the documented Magpie CLI. Read capabilities, group reuse, host startup and
service navigation must first be proven in an isolated profile.

The user confirmed a separate plugin page and explicitly prohibited modifying
the existing Library code. Do not set `replaces: "library"` or inject controls
into its Skills tab. See ADR 0005.

## Integration candidates and excluded approaches

1. Separate plugin page plus local service, with Magpie handling synchronization:
   accepted architecture awaiting a compatibility probe.
2. Existing public page bridge alone: presently lacks the required Skills
   read/write capabilities; it is not a proven complete implementation.
3. Modifying the existing Library code, injecting into its UI, or replacing
   its page: excluded by the user's explicit boundary.

If the current plugin API cannot support a safe independent implementation,
report that limitation rather than modifying Library as a workaround.

## Consequences and safety requirements

- Assignment writes must be serialized and use the latest assignment list;
  the CLI sets a list rather than offering a per-agent atomic toggle.
- Showing only installed agents must not implicitly erase hidden associations.
- Shared skill folders can prevent truly independent per-agent enable/disable.
- A local service must bind only to loopback, reject unauthorized writes and
  arbitrary executable/path input, and never return MCP/provider credentials.
- Multiple labels per skill are confirmed in ADR 0002. Label persistence and
  identity remain open until existing `SkillGroups` behavior is clarified.
- The user's latest instruction limits the current stage to detailed design.
  Do not implement or run further diagnostics. An earlier isolated diagnostic
  was stopped; production installation and live mutations were not performed.
- Upstream built-in groups allow at most one group per skill. Propose separate
  plugin metadata for multiple labels rather than altering Library groups.

## Validation gate

After a future explicit request to proceed, demonstrate the selected integration
path against Magpie 0.1.2012 using an isolated test profile, not the user's live
skills library. No such tasks should run during the current design-only stage.
