# Domain Glossary

Date: 2026-10-29
Status: draft; multiple labels, Windows-only scope and uninstall retention confirmed.

| Term | Meaning | Important distinction |
| --- | --- | --- |
| Skill | A library-managed skill folder containing `SKILL.md`. | Content is owned by Magpie, not the label UI. |
| Label / Tag | A user-defined classification attached to a skill. | A skill may have multiple labels; labels are not exclusive folders. |
| Group view | A way to browse skills that share a classification. | A presentation view is not necessarily a separate stored object. |
| Source group | A built-in grouping by the skill's origin repository/site. | Origin is not the user's functional label. |
| SkillGroup | An existing upstream Magpie exclusive group structure. | Upstream allows one group per skill, unlike the required multiple labels; do not change its behavior. |
| Installed agent | An agent detected in the current Windows environment, using an applicable CLI/app detection rule. | WSL and remote agents are out of scope; a leftover config folder alone may not prove installation. |
| Skill-capable agent | An agent with a skills integration Magpie can use. | Installation alone does not imply skills support. |
| Agent association | The persisted request to give a library skill to an agent. | Retain it after uninstall; hiding the agent is not an unassignment. |
| Effective availability | Whether an agent actually reads a skill. | Shared folders can make a skill available without an independently removable association. |
| Gone agent | An upstream target retained for cleanup although it is no longer installed. | Hide its normal icon without silently deleting its state. |
| Machine-local disable | Magpie's `off-here` / `on-here` override. | Different from assigning/unassigning one agent. |
| Global switch | An all-on/all-off control for the skill across currently discovered, installed, skill-capable Windows agents. | It overwrites current eligible-agent selections; it does not remember or restore custom selections or clear hidden historical associations. |
| Plugin page | A separate Skills Management page registered under Magpie's Extensions/Plugins section. | It must not replace Library or modify its code; a page registration does not grant private APIs. |
| Plugin local service | A plugin-owned backend listening only on 127.0.0.1 for its independent UI. | The architecture is accepted; installed-version integration remains to be validated. |
| Aggregate state | All on, all off or mixed, calculated from the current eligible-agent associations. | Not a separately persisted master enable flag or a remembered selection snapshot. |
| Tag metadata | Classification records stored separately by the plugin. | It must not rewrite native skill content, associations or built-in exclusive groups. |
| Design-only stage | The current stage authorized by the user's latest instruction. | Documentation only; no further implementation, service startup, installation or test execution. |

## Relationships

- A skill can have multiple labels (confirmed by the user).
- A label/group can contain multiple skills.
- A skill can have multiple agent associations.
- An association is not an installation record and not proof of effective
  availability.
- Normal agent controls should be the intersection of detected, in-scope,
  skill-capable agents.
- Agent scope is the current Windows installation only (confirmed by the user);
  WSL agents are excluded.
- An uninstalled agent's historical associations are retained while its icons
  are hidden (confirmed by the user).
- Global on assigns all currently eligible agents; global off unassigns those
  agents. There is no custom selection snapshot or restoration (confirmed by
  the user).
- The personal manager has its own plugin page; built-in Library code and
  navigation remain untouched (confirmed by the user).
