# Shout — Refinement Brief

## Problem and goal

Callers want an emphatic greeting: `shout(name)` returns the greeting for the name in upper case.

## Users and context

Library callers who build banners.

## Scope

In scope: a new exported `shout(name)` function in `src/shout.js`. Out of scope: changing `greet`.

## Requirements and behavior

1. `shout(name)` returns `greet(name)` converted to upper case.

## Acceptance checklist

1. `shout("Ada")` returns `"HELLO, ADA!"`.

## Edge cases and failure behavior

None identified.

## Constraints and dependencies

No dependencies; pure function.

## Current application behavior

`src/greet.js` exports `greet(name)`, which returns `Hello, <name>!`.

## Decisions

- Reuse `greet` rather than duplicating its format.

## Assumptions

None identified.

## Open questions

None identified.
