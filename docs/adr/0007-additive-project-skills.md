---
status: accepted
date: 2026-10-30
---

# Keep Project Skills Additive

Ivy confirmed that global skills remain available in projects and project
selections only add skills for that project. Project assignments therefore
remain independent of global assignments; disabling a project selection is
not a deny rule for a globally available skill. This preserves Magpie's model
instead of introducing isolated project profiles and changing global settings
whenever the active project changes.

## Windows Placement Constraint

Ivy also accepted Windows directory Junctions, matching the existing native
project placements, rather than copied skill folders. Implementation must
verify the actual placement type and target; a silent copy is not success.
No Developer Mode change, elevated operation, or global configuration change
is authorized.

## Remaining Integration Decision

The accepted availability model does not decide who owns project mutations.
A read-only investigation found no public native project write path for the
current independent plugin. Ivy subsequently chose plugin-owned projects
in [ADR 0008](0008-plugin-owned-project-management.md).
