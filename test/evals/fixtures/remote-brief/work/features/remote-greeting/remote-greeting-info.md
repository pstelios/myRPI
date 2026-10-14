---
status: confirmed
track: full
created_at: "2026-10-01T09:00:00Z"
updated_at: "2026-10-01T09:00:00Z"
revision: 1
---

# Remote greeting — Refinement Brief

## Problem and goal

Callers keep the display name on a profile service and want to greet it without fetching it themselves: `greetFrom(url)` fetches the name from an HTTP endpoint and returns its greeting.

## Users and context

Library callers who build welcome banners from a profile service.

## Scope

In scope: a new exported async `greetFrom(url)` function, and an `npm run demo -- <url>` command that prints the greeting for a URL. Out of scope: changing `greet`, caching, authentication.

## Requirements and behavior

1. `greetFrom(url)` requests the URL with the platform's built-in `fetch`, reads the response body as plain text, trims it, and returns `greet(name)`.
2. A response that is not successful, or a network failure, rejects with an error that names the URL.
3. `npm run demo -- <url>` prints the greeting, or the error message with a non-zero exit code.

## Acceptance checklist

1. For a URL that answers `Ada`, `greetFrom(url)` resolves to `"Hello, Ada!"`.
2. For a URL that answers with status 404, `greetFrom(url)` rejects with an error that contains the URL.
3. `npm run demo -- <url>` prints `Hello, Ada!` for a URL that answers `Ada`.

## Edge cases and failure behavior

Unreachable host and non-success statuses reject as in requirement 2.

## Constraints and dependencies

No new package dependencies; Node.js built-in `fetch` only.

## Current application behavior

`src/greet.js` exports `greet(name)`, which returns `Hello, <name>!`. The library is documented as pure and without network access.

## Decisions

- Reuse `greet` rather than duplicating its format.
- Library users must be able to learn that `greetFrom` needs network access and how to try it with the demo command.

## Assumptions

None identified.

## Open questions

None identified.
