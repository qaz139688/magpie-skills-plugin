# ADR 0002: Allow Multiple Labels per Skill

Date: 2026-10-29
Status: accepted for label cardinality only.

## Context

The user was asked whether a skill may have multiple labels rather than belong
to exactly one exclusive group. The user answered yes.

## Decision

A skill may have multiple labels. The relationship between skills and labels
is many-to-many.

When browsing one label, show every skill assigned that label. For example,
one skill labeled both "frontend" and "design" appears under each label.
This does not create two copies of the skill or two independent assignment
states.

## Consequences

- Do not model classification as one exclusive parent folder per skill.
- Skill content and agent associations remain independent of label membership.
- Browsing one label must not remove the skill's other labels.

## Not decided here

- Whether labels are persisted using existing Magpie groups or plugin metadata.
- How selecting several labels combines filters (union or intersection).
- Label naming, ordering, colors, batch editing and deletion UX.
- Agent scope, enable/disable semantics and the plugin integration architecture.
