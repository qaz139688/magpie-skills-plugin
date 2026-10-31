# Personal Magpie Skills Manager

This context describes a personal management view over Magpie's skills,
their classifications, and their global or project-specific availability.

## Language

### Skills and classification

**Skill**:
A reusable capability kept in Magpie's Library.
_Avoid_: Plugin, label, project

**Label**:
A user-defined classification attached to a skill; a skill may have several
labels.
_Avoid_: Folder, exclusive group

**Source**:
The origin of a skill, distinct from its functional labels.
_Avoid_: Label, category

**Source URL**:
A web address identifying a skill's source; a custom display address does not
replace its official installation origin.
_Avoid_: Update source, installation setting

**Source owner**:
The person or organization responsible for a confirmed source.
_Avoid_: Inferred author, skill-name match

### Agents and availability

**Agent**:
An assistant application that can consume skills.
_Avoid_: Skill, project

**Installed agent**:
An agent detected in the current Windows environment.
_Avoid_: Known agent, leftover configuration

**Skill-capable agent**:
An agent whose skill support Magpie can manage.
_Avoid_: Installed agent

**Association**:
A recorded selection requesting that an agent receive a skill.
_Avoid_: Installation, effective availability

**Global assignment**:
An association applying to an agent across its projects.
_Avoid_: Project assignment, remembered selection

**Effective availability**:
The skills an agent can actually read, including those available through a
shared location.
_Avoid_: Association count, checkmark state

**Shared availability**:
Availability common to agents that read the same skill location.
_Avoid_: Independent agent isolation

**Global switch**:
A skill's all-on/all-off action across currently eligible Windows agents.
_Avoid_: Project switch, selection restore

**Discovery cache**:
The short-lived result of checking which Windows agents are installed and
skill-capable; an expired or failed result cannot authorize a write.
_Avoid_: Permanent agent list, confirmed write

**Pending intent**:
The state a user selected in the page while the authoritative Magpie write is
still in progress. It is not the same as a confirmed association.
_Avoid_: Completed assignment, saved state

**Aggregate state**:
The all-on, all-off, or mixed summary of a skill's eligible-agent selections.
_Avoid_: Separate master flag

**Gone agent**:
A formerly associated agent that is no longer installed here.
_Avoid_: Unassigned agent

### Projects

**Project**:
A local working folder with its own skill selections.
_Avoid_: Label, source repository

**Native project**:
A project whose selections and placements are managed by Magpie.
_Avoid_: Plugin project

**Plugin project**:
A project explicitly registered with this plugin, whose selections and
managed placements are independent of native projects.
_Avoid_: Imported native project, synchronized project

**Project assignment**:
An association adding a skill for an agent in one project, without changing
global assignments or another project.
_Avoid_: Global assignment, per-project deny rule

**Eligible project agent**:
An installed, skill-capable Windows agent with a known project skill directory.
_Avoid_: Any historical project assignment

**Additive project enablement**:
Project-selected skills supplement globally available skills rather than
replace them.
_Avoid_: Isolated project profile, project-only skill set

**Native membership write**:
The narrow operation that changes one skill's agent list in a native project's
`skills` map through the controlled writer, without allowing general native
project editing.
_Avoid_: Native project import, general Library edit

**Managed placement**:
A skill placement owned by its manager, distinct from the source skill and
the user's independently maintained files.
_Avoid_: User-owned folder, source skill
