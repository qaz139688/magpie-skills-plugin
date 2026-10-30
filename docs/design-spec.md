# Personal Magpie Skills Manager: Detailed Design

Date: 2026-10-29 (Asia/Shanghai)
Stage: DESIGN ONLY
Status: confirmed product boundaries; proposed implementation details.

> Implementation status (2026-10-30): the design has been executed in the
> workspace and the plugin has been formally installed in the live Magpie
> profile. The design-only constraints below are historical; see
> [implementation.md](implementation.md) for the implementation and live
> installation record.

This document is a design, not an implementation or execution authorization.
Do not write plugin code, run tests, start services, modify live assignments,
install dependencies or register the production plugin at this stage.

## 1. Product goal

Add an independent personal Skills Management page to Magpie's Extensions
section. Make an existing skill collection easier to classify and control
without modifying the built-in Library page or its code.

The extension is a management view over Magpie's existing skills, not a second
skill installer or a replacement synchronization engine.

## 2. Confirmed requirements

| Requirement | Confirmed behavior |
| --- | --- |
| Classification | One skill may have multiple labels. |
| Browsing | Browsing a label shows each associated skill once. |
| Environment | Manage only agents installed in the current Windows environment. |
| Missing agents | Hide their icons but retain their historical associations. |
| Individual controls | Keep existing per-agent assignment controls. |
| Global control | For the skill being controlled, assign or unassign every currently eligible agent. |
| No restoration | All-on/all-off does not remember or restore the earlier custom subset. |
| Page placement | Add a separate Skills Management entry under Extensions. |
| Existing Library | Do not modify, inject into or replace its code, page or navigation. |
| Backend | A plugin-owned service listening only on 127.0.0.1 is acceptable. |
| Current stage | Detailed design only; no further implementation or execution. |

An eligible agent is installed, belongs to the current Windows environment,
and has a Skills integration that Magpie can manage. Discovery is not the same
as merely finding a leftover configuration folder.

The confirmed global action is across agents for the current skill. A separate
switch across every skill in the library is not included.

## 3. Scope

### Included in the proposed first version

- List skills already managed by Magpie.
- Create, rename and delete labels.
- Add and remove multiple labels on a skill.
- Browse All skills, Untagged skills, or one selected label.
- Search skill names and descriptions within the current view.
- Show current eligible Windows agents and their per-skill associations.
- Provide per-agent enable/disable and per-skill all-on/all-off controls.
- Show pending operations, failures, unavailable capabilities and mixed state.
- Preserve hidden historical associations.

### Not included

- Skill marketplace, installation, source updates or uninstallation.
- Editing SKILL.md or moving/duplicating skill folders.
- Changing built-in groups or regrouping the original Library.
- MCP, instructions, hooks, routing, model or account management.
- WSL, remote agents or future automatic onboarding of newly installed agents.
- Nested labels, AI auto-labeling, drag-and-drop, cloud sync or a database.
- Remembering custom subsets for global-switch restoration.
- Library-wide all-skills commands or batch tag editing.
- Injected CSS/JavaScript in the original Library.
- A Windows system service, scheduled task or separate desktop application.

## 4. Architecture and ownership

```text
Magpie Extensions
    |
    +-- Independent Skills Management page
            |
            +-- Plugin-owned loopback service
                    |
                    +-- Skills read adapter
                    +-- Windows agent discovery adapter
                    +-- Assignment command adapter
                    +-- Plugin-only label metadata

Magpie's original Library and synchronization engine remain unchanged.
```

| Component | Owns | Must not own |
| --- | --- | --- |
| Plugin page | Label browsing, controls, UI state and feedback | Native Library state or synchronization |
| Local service | Narrow operations, validation, serialization and response projection | Generic command execution or credential APIs |
| Label store | Tag definitions and skill-tag relationships | Skill files, native agent associations or built-in groups |
| Magpie | Skill content, associations, ownership, link/copy behavior and synchronization | Plugin-specific tag presentation |

Register a normal plugin page through magpie.page, without a replaces field.
The service uses the plugin host; it is not installed as a machine-wide daemon.
Actual startup, reload and shutdown behavior is a future compatibility gate.
Never terminate Magpie's shared Bun host as a way to stop this plugin.

## 5. Integration boundary

### Reading skills

Prefer an existing supported Magpie query interface if one provides the
necessary skill and assignment fields. An exact supported query has not yet
been established.

A candidate fallback is read-only parsing of the native library file, projecting
only Skills-related fields into a narrow response. Its path must be resolved
for the actual running profile, not hard-coded to one user's home.

The native library file can also contain MCP configuration or other sensitive
data. Never return, log, export or expose the whole object.

Do not write the native library file directly.

### Discovering Windows agents

Reuse Magpie's own detection and capability information where a suitable
interface exists. A read cache alone is not proof of current installation.

The adapter needs an explicit, testable distinction among:

- Installed Windows CLI agents.
- Installed Windows desktop agents.
- Agents retained only for cleanup after uninstall.
- WSL and remote targets.
- Agents without a supported Skills integration.
- Independently/shared-folder-provided skills that cannot be individually
  controlled.

Do not replace this with a directory-exists heuristic or assume every agent
listed in an old association is installed.

If no reliable compatible discovery interface can be established, show a
discovery error and disable writes. Do not present uncertain data as an empty
installed-agent list or execute an all-off action from it.

### Mutating assignments

Delegate to Magpie's existing assignment operation. The currently observed CLI
sets the complete association list, so the adapter must preserve associations
outside the action's eligible-agent set.

The plugin service must not add an unrestricted shell endpoint, hand-built
shell strings, or arbitrary executable/path arguments. Treat skill names and
agent IDs as validated data.

The sandboxed page must not directly fetch private Library endpoints. Do not
assume an undocumented bridge method or add permissions that Magpie does not
support.

## 6. Label persistence

Upstream Magpie's built-in GroupSkills operation allows at most one group per
skill. It cannot directly represent the confirmed many-to-many label model.

Proposed choice: a small plugin-owned JSON metadata file under the active
Magpie profile, in a distinct Skills Manager directory. No database is needed.
This path is a design choice, not a newly written file at this stage.

| Record | Fields | Purpose |
| --- | --- | --- |
| Metadata header | Schema version | Validate and migrate the plugin's own format later |
| Tag | Stable ID, display name | Rename without changing every skill-tag link |
| Skill-tag link | Native library skill name, set of tag IDs | Many-to-many classification |

Suggested rules:

- Trim label names and reject empty names.
- Avoid duplicate names differing only by case or surrounding whitespace.
- A skill can have no labels and still appear under All and Untagged.
- Renaming a label changes its display name, not its stable ID.
- Deleting a label removes only that classification and its links, never skills.
- A native skill update under the same identity preserves its labels.
- Missing-skill metadata is not silently attached to a different skill by
  guessing a matching description or source path.
- Retain orphaned classification records initially; automatic cleanup is not
  required for the first version.
- Write only the plugin metadata, using atomic replacement and a recoverable
  previous version. A save failure must leave the last valid metadata usable.
- Invalid metadata produces a visible error; do not replace it with an empty
  classification set and overwrite the original.

Native skill names are a candidate identity because the current library uses
them for assignment operations. Rename and delete/reinstall identity semantics
remain a future validation item; do not claim a universal stable native ID.

## 7. Page structure and interaction

```text
Skills Management

Label navigation            Skill list
---------------------       -----------------------------------------
All skills                  Search by name or description
Untagged                    Current view / unique skill count
User-defined labels
                            Skill name / description
Create label                Assigned label chips / Edit labels
                            Aggregate state: All on / Mixed / All off
                            Eligible Windows agent controls
```

Use Magpie's theme variables and established application patterns. This is a
management page, not a new marketing design. The original Library is untouched.

### Label browsing

Use one active label filter in the first version. Multi-label membership does
not require simultaneous multi-label filtering.

Search is combined with the active label. Selecting another label does not
change classifications or assignments. Counts represent unique skills in
the selected view; summing all label counts can double-count a skill.

### Skill row

- Name and concise description.
- Current label chips and an explicit Edit labels control.
- A calculated aggregate switch/state.
- Agent icons or named chips for eligible agents only.
- Names exposed as accessible labels/tooltips; icons are not the sole signal.
- A pending indicator and a specific error message where relevant.

### Aggregate switch

This is derived from current associations, not a separately saved master flag.

| Current eligible-agent selections | Display | Proposed next toggle |
| --- | --- | --- |
| Every eligible agent selected | All on | Unassign all eligible agents |
| No eligible agent selected | All off | Assign all eligible agents |
| Some eligible agents selected | Mixed | Assign all eligible agents |
| No eligible agents discovered | Unavailable | Disabled; make no change |

Mixed-to-all-on is a proposed UI convention, not another user-confirmed
requirement. The UI must make that action clear rather than silently interpret
a mixed state as all-off.

Individual controls remain usable after all-off because there is no persistent
global pause layer. Changing an individual control recomputes the aggregate.

## 8. Assignment semantics

Let A be the native skill's latest association set. Let E be the latest set of
eligible agents, determined when the action is executed.

| Action | Resulting associations |
| --- | --- |
| Enable one eligible agent x | A union {x} |
| Disable one eligible agent x | A minus {x} |
| Global on for the skill | A union E |
| Global off for the skill | A minus E |

Everything in A outside E is retained. In particular, hidden associations for
uninstalled agents are not erased by global off.

No custom subset snapshot is stored. Global on after global off enables every
currently eligible agent, not the old subset.

### Example

Codex and Claude Code are installed and eligible. WorkBuddy is uninstalled but
has a historical association.

| Step | Codex | Claude Code | Historical WorkBuddy |
| --- | --- | --- | --- |
| Initial | On | Off | Retained, hidden |
| Global off | Off | Off | Retained, hidden |
| Global on | On | On | Retained, hidden |
| Individual Codex off | Off | On | Retained, hidden |

Discovery is evaluated on the click, not continually applied as a policy.
Installing an agent later must not silently assign every skill to it.

## 9. Write flow, concurrency and failure

Proposed write flow:

1. Validate the skill identity and requested operation.
2. Serialize writes originating in this plugin.
3. Refresh the native skill associations and eligible agents.
4. Reject a missing skill, unavailable discovery or unsupported capability.
5. Calculate the new association set, retaining hidden associations.
6. Delegate the mutation to Magpie and wait for its result.
7. Re-read state and show the confirmed result; do not optimistically claim
   completed synchronization.

Serializing plugin writes does not serialize changes made simultaneously in
the original Library or an external CLI. A complete-list CLI write has a
read-to-write race unless the native interface offers a transactional delta
operation or a version precondition.

This is a real design risk. A fresh read and post-write verification reduce
stale-state errors but do not prove cross-writer atomicity. Verify available
native operations before implementation; do not advertise a locking guarantee
that the public CLI does not provide.

On errors:

- Preserve the last confirmed UI state.
- Display the failing operation and a useful reason.
- Refresh native state before offering a retry.
- Do not retry a write blindly after an ambiguous timeout.
- Do not restore an old snapshot over external changes.
- Do not claim all-on/all-off succeeded if native application was partial.

## 10. Effective availability and shared folders

Agent association is not always equivalent to whether an agent can read a
skill. Magpie can expose skills through shared folders, and some agents read
those folders independently.

The design must distinguish:

- Native association requested by this manager.
- Actual native synchronization result.
- A skill independently available through a shared or agent-owned folder.
- Existing machine-local disable overrides.

A locked/native-independent skill cannot be promised to turn off merely by
removing an association. Mark this limitation clearly and never delete an
agent-owned or shared source folder to enforce the switch.

Likewise, do not substitute off-here/on-here for the confirmed assignment
semantics without checking its Windows/WSL scope and interaction with existing
overrides. An existing native override can prevent an assignment from becoming
effectively enabled; surface the precondition instead of reporting false success.

Exact supported behavior for these cases remains a compatibility gate, not an
implemented solution.

## 11. Local service security and lifecycle

### Security requirements

- Bind only to 127.0.0.1, never all interfaces or the LAN.
- Expose only skill-list, label and bounded assignment operations.
- Do not expose arbitrary filesystem access, generic CLI execution, providers,
  credentials, MCP secrets or the original configuration object.
- Validate HTTP Host to resist DNS rebinding.
- Require a short-lived per-run capability/session for state-changing requests.
- Reject untrusted origins and unauthorized requests. Origin null alone is not
  a sufficient authorization rule for a sandboxed frame.
- Require an explicit non-simple authenticated write request; no mutations on
  GET or ordinary cross-site form submissions.
- Prevent unrelated websites from framing the service and inducing clicks.
- Keep tokens out of URLs, ordinary logs and persisted public plugin options.
- Bound request size, execution timeout and write queue length.

The bootstrap/authentication path must be proven separately for Magpie desktop
and magpie web. The observed service bridge metadata does not prove a complete
secure desktop integration. Do not invent an unsupported bridge call to pass
a secret to the page.

### Lifecycle requirements

- Use a configurable local service port supported by the plugin manifest.
- A port conflict produces a clear error, not a fallback onto another app's
  port or an automatic change to Magpie's settings.
- Initialization is idempotent; reopening the page must not create duplicate
  listeners or processes.
- Plugin reload/disable should release its own service without terminating
  other plugins' shared host.
- Do not add Windows startup entries, scheduled tasks or a system service.
- Do not download or upgrade Bun during this design stage.

## 12. Proposed backend responsibilities

These are conceptual operations, not confirmed HTTP routes or implemented APIs.

| Operation | Reads/writes | Result |
| --- | --- | --- |
| Read manager state | Skills projection, eligible agents, labels | Only UI-needed data and capability diagnostics |
| Manage tag | Plugin metadata only | Saved tag definitions |
| Set skill tags | Plugin metadata only | Updated tag IDs for an existing skill |
| Set individual association | Native assignment engine | Fresh confirmed skill/agent state |
| Set all eligible associations | Native assignment engine | Fresh all-on/all-off or explicit failure |

One response should carry enough updated state for the current row and its
aggregate. Avoid multiple independent frontend reads that can display mutually
inconsistent counts and association states.

## 13. Future acceptance matrix

Not to execute at this stage.

| Case | Expected result |
| --- | --- |
| Independent installation | Extra page under Extensions; original Library remains available |
| Plugin off/remove | Extra page disappears; original Library and skills remain intact |
| Two labels on one skill | Skill appears once in each label's view |
| Untagged skill | Visible under All and Untagged |
| Rename/delete label | Classification changes only; native skills and associations unchanged |
| Missing metadata file | A valid empty classification view without modifying native data |
| Invalid metadata file | Visible error; preserve the original file |
| Installed Windows CLI/desktop agent | Shown only when detected and skill-capable |
| Uninstalled agent with leftover directory | No normal icon; historical association retained |
| WSL or remote target | Not shown or newly assigned |
| Global off/on after custom subset | None/all eligible agents selected; no subset restoration |
| Hidden historical association | Retained through both global operations |
| Agent uninstalled between load and click | Refreshed eligibility prevents a stale enable |
| No eligible agents | Disabled global controls; no assignment mutation |
| Native shared-folder lock | Honest unavailable/locked behavior; no destructive workaround |
| Native override prevents availability | Visible precondition; no false enabled status |
| Concurrent original-Library change | No unsupported claim of atomicity; conflict behavior verified |
| Native write failure/timeout | Honest error, fresh read before retry |
| Unauthorized local/cross-site write | Rejected; no mutation |
| Service port conflict | Clear failure without changing unrelated settings |

## 14. Known evidence and unresolved gates

### Evidence collected before the design-only instruction

- Local executable reports Magpie 0.1.2012.
- Native CLI help contains per-skill association assignment operations.
- Public plugin pages support separate navigation entries.
- Upstream public page reads do not expose Skills management.
- Upstream native groups are exclusive, unlike the requested multiple labels.
- An isolated diagnostic returned page URL and service metadata.

The isolated diagnostic was stopped. It did not establish browser rendering,
Skills reads/writes, secure bootstrap or service lifecycle correctness.
Scratch diagnostic files outside the project are not a delivered plugin.

### Gates before a future implementation

1. Identify reliable supported skill and Windows-agent query adapters.
2. Resolve desktop versus web bootstrap, sandbox and local-service authentication.
3. Verify assignment concurrency, shared-folder locks and existing overrides.
4. Confirm host startup/reload/disable and port configuration on the installed
   Magpie version without upgrading it.
5. Verify profile resolution, skill identity and label metadata durability.

If a gate cannot be satisfied without altering the original Library code,
report the limitation. Do not violate the accepted independent-plugin boundary.

## 15. Future work sequence

> Historical note: this sequence was completed on 2026-10-30. The production
> plugin is now installed; see [implementation.md](implementation.md).

This section is a proposal only. Execution requires a new explicit request.

1. Compatibility investigation in an isolated profile, with no real skills.
2. Small data/assignment adapters and plugin-owned metadata, with boundary tests.
3. Independent manager page following Magpie's existing design language.
4. Isolated integration and rendered interaction verification.
5. User review of behavior, followed by separately approved formal installation.

At design time, the deliverables were this design, discovery notes, the
glossary and ADRs. The production plugin now exists and is installed.
