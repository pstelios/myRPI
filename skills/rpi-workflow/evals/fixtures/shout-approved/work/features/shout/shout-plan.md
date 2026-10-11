---
status: approved
created_at: "2026-10-02T09:00:00Z"
description: "Add shout(name), the upper-case greeting."
brief_revision: 1
suite_version: 1.0.0
---

# Shout — Implementation Plan

## Summary

Add `src/shout.js` exporting `shout(name)`, which returns `greet(name).toUpperCase()`, with a unit test.

## Requirements and acceptance coverage

| Acceptance item | Scenario | Test |
|---|---|---|
| 1 | Shouting a greeting | unit |

## Gherkin scenarios

`work/features/shout/shout.feature`: 1 scenario.

## Technical design

- `src/shout.js` exports `shout(name: string): string`; it imports `greet` from `./greet.js`.
- No I/O, persistence, network, or security impact.

## Architecture review

Consistent with `docs/design.md` (one pure function per module). No change.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Locale-specific upper-casing | Low | Use `toUpperCase()`; names in tests are ASCII |

## Implementation steps

1. Add the unit test `test/shout.test.js` named "Shouting a greeting"; confirm it fails.
2. Add `src/shout.js`.
3. Run full verification.

## Expected changes by file

| Path | Change | Purpose |
|---|---|---|
| `test/shout.test.js` | new | Scenario test |
| `src/shout.js` | new | Behavior |

## Existing feature impact

Reviewed `work/done/greeting`: no impact; `greet` is unchanged.

## Verification

- Focused: `node --test test/shout.test.js`.
- Full: `npm run check`.

## Implementation progress

| Scenario | Test | State |
|---|---|---|
| Shouting a greeting | test/shout.test.js "Shouting a greeting" | todo |

## Dependencies and open decisions

None.
