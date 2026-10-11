---
status: approved
created_at: "2026-10-04T10:00:00Z"
description: "End greetings with a period instead of an exclamation mark."
brief_revision: 1
suite_version: 1.0.0
---

# Polite — Implementation Plan

## Summary

`greet(name)` returns `Hello, <name>.` instead of `Hello, <name>!`.

## Technical design

- Change the template string in `src/greet.js`.

## Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Callers depend on the old punctuation | Medium | Noted in the brief; accepted |

## Implementation steps

1. Update `test/greet.test.js` "Greeting a person" to expect `Hello, Ada.` and confirm it fails.
2. Change `src/greet.js`.
3. Amend the completed `greeting` feature scenarios as listed under Existing feature impact.
4. Run full verification.

## Expected changes by file

| Path | Change | Purpose |
|---|---|---|
| `test/greet.test.js` | modify | Scenario test |
| `src/greet.js` | modify | Behavior |
| `work/done/greeting/greeting.feature` | modify | Amend completed scenarios "Greeting a person" and "Names are trimmed" to expect `Hello, Ada.` |

## Existing feature impact

Affected: the completed `greeting` feature. Its scenarios "Greeting a person" and "Names are trimmed" expect `Hello, Ada!`; amend both to expect `Hello, Ada.` (approved by the user).

## Verification

- Full: `npm run check`.

## Implementation progress

| Scenario | Test | State |
|---|---|---|
| Greeting ends with a period | test/greet.test.js "Greeting a person" | todo |

## Dependencies and open decisions

None.
