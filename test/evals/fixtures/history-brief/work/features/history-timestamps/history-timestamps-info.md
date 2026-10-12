---
status: confirmed
track: full
created_at: "2026-10-05T09:00:00Z"
updated_at: "2026-10-05T09:00:00Z"
revision: 1
---

# History timestamps — Refinement Brief

## Problem and goal

The stored greeting history (`data/history.json`, currently a JSON array of names) must record when each greeting happened. Each entry becomes an object `{ "name": string, "at": ISO-8601 string }`.

## Requirements and behavior

1. `recordGreeting(name)` stores `{ name, at }` entries.
2. `loadHistory()` returns entries in the new shape; existing files with plain names still load (their `at` is `null`).

## Acceptance checklist

1. After `recordGreeting("Ada")`, the file holds an object with `name` "Ada" and an ISO-8601 `at`.
2. A file in the old shape loads with `at: null` entries.

## Constraints and dependencies

Existing history files on users' machines must keep working.

## Open questions

None identified.
