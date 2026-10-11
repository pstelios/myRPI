# Implementation plan template

Write the plan to `<features.working>/<slug>/<slug>-plan.md`. Frontmatter fields and statuses are defined in [lifecycle.md](lifecycle.md#plan-frontmatter-and-statuses). Use the section headings exactly as written below.

## Required sections

Every plan has these sections, in this order. On the light track, keep each one short.

| Section | Content |
|---|---|
| `## Summary` | What changes and why, in a few sentences; the source brief and its revision. |
| `## Requirements and acceptance coverage` | Table: each acceptance item → scenario(s) → test kind. |
| `## Gherkin scenarios` | The `.feature` file, its scenario count, and how test and case names relate to scenario names. |
| `## Technical design` | Decisions with status (confirmed, user decision, or recommendation) and rationale; responsibilities and data flow; contracts at module or service boundaries (interfaces, request and response shapes, events, errors), not full code-level signatures; security and privacy; data and persistence; network and failure behavior; state and concurrency; accessibility, performance, and deployment where relevant. Mark topics that do not apply as N/A instead of padding. |
| `## Architecture review` | Points checked against the architecture document (or `none` configured), the outcome, and the user's decision. |
| `## Risk register` | Table: risk, impact, likelihood, mitigation. |
| `## Implementation steps` | Ordered steps. Writing or updating the scenarios comes first; scenario tests come before the behavior they verify. |
| `## Expected changes by file` | Table: explicit path, `new`/`modify`/`delete`, purpose. Include scenarios, code, tests, configuration, documentation, and completed features' `.feature` files the plan amends. |
| `## Existing feature impact` | Features reviewed, overlaps found, and the scenario, code, and test changes recommended for each (or "No impact found" with what was checked). |
| `## Verification` | Focused and full commands from the configuration, and how each scenario and acceptance item is verified. |
| `## Implementation progress` | One row per scenario and outline example: scenario, test or eval case, state (`todo` at first). See [lifecycle.md](lifecycle.md#implementation-progress). |
| `## Dependencies and open decisions` | Prerequisites, unresolved decisions, and which steps depend on them; or `None`. |

## Conditional and optional sections

| Section | When |
|---|---|
| `## Rollback and compatibility` | **Required** when persisted data, a stored schema, a public contract, or the configuration schema changes shape: how existing data or callers keep working, how to roll back, and what cannot be undone. |
| `## Success metrics` | Optional. Measurable signals of success, or `N/A: <reason>` (for example, the application has no telemetry). |
| `## Rollout` | Optional. Staging, feature flags, or migration order, when the change is not released all at once. |
| `## Implementation changes from approved plan` | Added only by `rpi-implement`; see [lifecycle.md](lifecycle.md#implementation-changes-from-approved-plan). |

## Skeleton

```markdown
---
status: draft
created_at: "YYYY-MM-DDTHH:MM:SSZ"
description: "<one-sentence goal>"
brief_revision: <brief revision>
suite_version: <suite version>
---

# <Feature title> — Implementation Plan

## Summary
## Requirements and acceptance coverage
## Gherkin scenarios
## Technical design
## Architecture review
## Risk register
## Implementation steps
## Expected changes by file
## Existing feature impact
## Verification
## Rollback and compatibility
## Success metrics
## Implementation progress
## Dependencies and open decisions
```

Omit `## Rollback and compatibility` only when no data, contract, or schema changes shape. Keep `## Success metrics`, with `N/A: <reason>` when there is nothing to measure.
