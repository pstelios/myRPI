---
status: in-progress
created_at: "2026-10-03T10:00:00Z"
description: "Add shout(name) and whisper(name)."
brief_revision: 1
suite_version: 1.0.0
---

# Volume — Implementation Plan

## Summary

Add `src/shout.js` (`shout`) and `src/whisper.js` (`whisper`), each with its own unit test file.

## Technical design

- `shout(name)` returns `greet(name).toUpperCase()`; `whisper(name)` returns `greet(name).toLowerCase()`.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| None significant | Low | Unit tests |

## Implementation steps

1. Shouting: `test/shout.test.js`, then `src/shout.js`.
2. Whispering: `test/whisper.test.js` (a separate test file; do not modify `test/shout.test.js`), then `src/whisper.js`.
3. Run full verification.

## Expected changes by file

| Path | Change | Purpose |
|---|---|---|
| `test/shout.test.js` | new | Scenario test: Shouting a greeting |
| `src/shout.js` | new | Behavior |
| `test/whisper.test.js` | new | Scenario test: Whispering a greeting |
| `src/whisper.js` | new | Behavior |

## Existing feature impact

None; `greet` is unchanged.

## Verification

- Focused: `node --test <file>`. Full: `npm run check`.

## Implementation progress

| Scenario | Test | State |
|---|---|---|
| Shouting a greeting | test/shout.test.js "Shouting a greeting" | passing |
| Whispering a greeting | test/whisper.test.js "Whispering a greeting" | todo |

## Dependencies and open decisions

None.
