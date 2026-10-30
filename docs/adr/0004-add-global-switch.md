# ADR 0004: Add a Global Switch Alongside Per-Agent Controls

Date: 2026-10-29
Status: accepted for all-on/all-off behavior across currently eligible agents.

## Context

The user was asked whether to keep only the existing per-agent enable/disable
controls. The user explicitly requested an additional global switch.

The user then clarified that off must turn all discovered agents off and on
must turn them all on, without remembering custom selections. This rejects
the earlier pause-and-restore proposal.

## Decision

Keep per-agent controls and add an all-on/all-off control for the skill being
controlled. Eligible agents are the currently discovered, installed,
skill-capable agents in the current Windows environment.

- On: assign every currently eligible agent to the skill.
- Off: remove every currently eligible agent from the skill's associations.
- Do not save a snapshot of earlier custom selections.
- On after off selects all eligible agents, not the earlier custom subset.
- Preserve historical associations for hidden, uninstalled agents as agreed
  in ADR 0003. WSL/remote targets are not eligible.

This is an assignment operation, not a separate persistent pause override.
Normal per-agent controls continue to edit the current association list.

For an association set A and eligible-agent set E read at execution time:

```text
global on:  A' = A union E
global off: A' = A minus E
```

## Consequences and constraints

- Resolve eligible agents at execution time rather than trusting a stale UI.
- If E is empty, disable the control and leave associations unchanged.
- Do not map all-off blindly to `agents none`, which would also remove hidden
  historical associations.
- Do not use machine-local `off-here` as a substitute without proving equivalent
  behavior; it is a different override and may affect out-of-scope targets.
- Shared-folder behavior must remain consistent with Magpie's engine and may
  prevent independent toggling. Surface that limitation instead of claiming
  successful effective disable.
- Do not promise that a global switch disables skills independently owned or
  read directly by an agent outside Magpie's control.
- No whole-library bulk control or additional batch features are approved by
  the request for this control alone.

## Acceptance example

With Codex and Claude Code eligible, a skill initially selected only for Codex
becomes selected for neither after global off and for both after global on.
An association for an uninstalled third agent remains unchanged throughout.
