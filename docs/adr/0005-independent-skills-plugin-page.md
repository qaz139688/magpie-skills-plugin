# ADR 0005: Add an Independent Skills Management Page

Date: 2026-10-29
Status: accepted for page placement and existing-Library boundary.

## Context

The user explicitly requested an independent Skills Management page, appearing
as an additional plugin entry under Magpie's Extensions section after
installation. The user forbids changing the existing Library code.

## Decision

Register a separate page through the supported `magpie.page` plugin manifest.
Use a Skills Management title and the plugin's own HTML/CSS/JS assets.

Do not declare `magpie.page.replaces`. Do not modify, patch, inject into or
replace the built-in Library page or its code.

The original Library remains available for its existing Skills, MCP,
instructions and other functionality. The plugin's controls delegate to
Magpie's existing management interfaces rather than replace its sync engine.

## Consequences

- Installing/enabling the plugin adds an independent navigation entry.
- Disabling/removing it must not require restoring modified Library code.
- Existing Library features are outside the plugin's UI implementation scope.
- Registration does not grant Skills read/write access; the accepted local
  service approach remains subject to a compatibility probe.
- If the independent plugin cannot be implemented safely with the current
  interfaces, report the limitation instead of changing Library.

## Not authorized by this decision

- Modifications to Magpie's built-in Library source or assets.
- Replacement of Library navigation or injection into existing Library tabs.
- Installation or configuration changes in the user's formal profile.
- Under the user's latest design-only instruction, no further diagnostic
  registration, code writing or service startup is requested either.
