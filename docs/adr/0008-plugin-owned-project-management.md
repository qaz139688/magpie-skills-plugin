---
status: accepted
date: 2026-10-30
---

# Give the Plugin Its Own Project Management

Acceptance is a product-ownership decision only. Ivy's latest instruction
originally kept this upgrade in design/planning. The plugin-owned project
management and narrow native-membership writer were subsequently implemented
and isolated-tested; live reload remains pending.

Ivy accepted plugin-owned project selections and placements because no public
native project write interface was found for the independent plugin.
Magpie-owned projects are displayed read-only, are not automatically adopted,
and do not synchronize their project selections with this plugin. Skill
content and global agent associations remain owned by Magpie.

The alternative was to keep project editing in the native page, which is
simpler but does not provide the requested project controls inside this page.
Directly editing native project records or borrowing private UI credentials
was rejected.

Only explicitly registered plugin projects may be changed. Only Junctions
created and still owned by this plugin may be removed; foreign folders,
overlapping native projects, and the original Library skills are preserved.
The confirmed Junction/no-copy rule and additive availability from ADR 0007
continue to apply.

## Update: native membership menu

The native project view remains read-only. Ivy later asked for a narrower
exception: a skill's "Add to project" menu may add that skill to a native
project, and clicking the joined entry again removes it, without opening the
native project view for editing. That write is limited to the native
project's `skills` map and goes through
`lib/native-projects.mjs`, which keeps a backup, writes atomically, invokes
`magpie library sync`, verifies the result, and restores the prior file if the
sync fails. General native project editing and direct `library.json` edits
remain prohibited.
