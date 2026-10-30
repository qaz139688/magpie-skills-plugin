# ADR 0003: Manage Only Agents Installed in the Current Windows Environment

Date: 2026-10-29
Status: accepted for agent scope and uninstall association retention.

## Context

Magpie can detect agents in Windows as well as WSL. The user explicitly
confirmed that this personal manager should only manage agents installed
in the current Windows environment.

The user subsequently approved retaining an uninstalled agent's historical
skill associations while hiding its icons.

## Decision

Normal skill controls and new assignment targets are limited to installed,
skill-capable agents in the current Windows environment.

Exclude WSL agents and agents on remote machines. An uninstalled agent
must not have an icon in the normal skill controls.

Keep historical associations for uninstalled agents. Do not automatically
remove them when detection changes or the page is opened. After reinstallation
and successful detection, they become eligible for display again; Magpie's
existing synchronization determines effective availability.

## Consequences

- Installation, skills capability and environment scope are separate checks.
- Do not probe or install WSL/remote agents for this feature.
- Do not treat a retained config folder as sufficient installation evidence
  where Magpie's applicable detection rule requires an executable or app.
- Filtering an agent out of the UI does not itself authorize deleting its
  historical associations or touching its files.
- A toggle for a visible agent must preserve historical associations for
  hidden, uninstalled agents.

## Not decided here

- Enable/disable behavior is recorded separately in ADR 0004.
- A manual hide preference for installed agents.
- The exact detection adapter and plugin integration architecture.
