# ADR 0006: Improve Skill Cards and Source Actions

Date: 2026-10-30 (Asia/Shanghai)
Status: accepted and implemented in the workspace; isolated verification
passed, with live Magpie reload still pending.

## Context

Ivy requested native agent icons, individual rounded capsule-style skill
cards, copy and local-folder buttons beside each skill name, a clickable source
line before the description, and GitHub owner avatars before names.

The existing page uses agent initials, a source label on the title line, and
list rows. It does not yet implement the requested actions.

## Decision

Keep the existing plugin, visual language, label model, and assignment rules.
Change the card's information hierarchy and add the requested utility actions.

Use the layout and source rules in
[experience-upgrade-plan.md](../experience-upgrade-plan.md):

- Real Magpie agent artwork, retaining installed-agent filtering.
- A rounded independent card for each skill.
- Exact-name copy and Library-folder opening beside the title.
- One source line between title and description.
- GitHub owner avatars only when the origin establishes that identity.
- Custom web origins stored separately from native installation metadata.
- Default-browser opening through a bounded host-side action.

Do not install or update skills as a side effect of editing their displayed
source. Do not infer an official source or author from a name alone.

## Alternatives considered

Direct remote images and ordinary new-tab links require less backend work,
but do not reliably provide offline icons or system-default-browser behavior
inside Magpie's embedded page.

Reuse native artwork and a bounded host action instead. Resolve the precise
asset-delivery and clipboard mechanisms against the actual installed page
during implementation; these mechanisms are not yet validated.

## Consequences

- Existing card actions and label/assignment behavior remain intact.
- New actions need explicit success/failure feedback and accessible names.
- Missing origins and unavailable images remain visible without fabricated
  attribution.
- Copied upstream assets retain the necessary license notices.
- Additive project availability and Windows Junctions are confirmed in
  [ADR 0007](0007-additive-project-skills.md); plugin project ownership is
  confirmed in [ADR 0008](0008-plugin-owned-project-management.md).
- This ADR authorizes no system configuration change, live project mutation,
  original Library modification, or silent conversion to copied skills.
