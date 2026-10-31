# ADR 0009: Cache Discovery and Apply Toggle Intent Immediately

Date: 2026-11-01
Status: accepted and implemented; isolated validation passed, live reload pending.

## Context

Every global skill toggle used to force a fresh `magpie ls` before calling the
Magpie CLI. The page also kept the old state until the write completed, making
a slow operation look unresponsive. Rapid clicks on the same row were ignored
while the first write was busy.

Isolated comparison showed:

- Reusing the existing 15-second discovery cache removed repeated discovery.
- Immediate local state and a short intent batch improved visible feedback
  without changing Magpie's authoritative write path.
- A resident native sidecar was faster but reproduced a cross-process lost
  update, so it is not accepted.

## Decision

Global skill writes use the cached discovery result when it is still fresh.
The existing discovery failure check remains: stale or failed discovery never
allows a write.

The page applies the user's intended state immediately. Single-agent toggles
are debounced for 120 ms and coalesced per skill and agent. If the intent
changes while a request is running, the final intent is sent after the current
request finishes. Global toggles show their intended state immediately but
remain a single, non-coalesced operation.

Magpie remains authoritative. Successful responses replace optimistic state;
failed requests restore the previous UI state and show an error.

## Consequences

- A click can use a discovery result up to 15 seconds old.
- The Magpie CLI still validates agents and writes the complete association
  list, so stale discovery cannot bypass native ownership or eligibility
  checks.
- Writes remain serialized by the service. Clicks to different skills can be
  initiated while another skill is waiting, but they do not run concurrently
  in the Magpie write queue.
- The local page can show an intended state while a write is pending; the
  pending marker distinguishes it from confirmed state.
- Cross-process atomicity with another Magpie writer remains unresolved and is
  outside this decision.

## Validation

- Backend tests verify cached discovery is used and discovery errors do not
  write.
- Isolated browser validation observes immediate state, a pending marker,
  successful final state, and an in-flight reversal. The reversal test caught
  a first-version bug: returning to the initial value was skipped even after a
  write had started. The final loop skips only when no write has been sent.
