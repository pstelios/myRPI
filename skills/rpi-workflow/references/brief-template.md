# Refinement brief template

Write the brief to `<features.working>/<slug>/<slug>-info.md`. Frontmatter fields and their rules are defined in [lifecycle.md](lifecycle.md#brief-frontmatter). Include only the sections that are relevant, but always include `Assumptions` and `Open questions` (write `None identified` when empty). Do not include an implementation plan.

```markdown
---
status: confirmed
track: full
created_at: "YYYY-MM-DDTHH:MM:SSZ"
updated_at: "YYYY-MM-DDTHH:MM:SSZ"
revision: 1
---

# <Feature title> — Refinement Brief

## Problem and goal
## Users and context
## Scope
<!-- In scope and out of scope (non-goals). -->
## Requirements and behavior
## Acceptance checklist
<!-- Numbered, observable outcomes. -->
## Edge cases and failure behavior
## Constraints and dependencies
## Current application behavior
<!-- Verified facts from source, tests, and configuration, with paths. -->
## Decisions
<!-- The user's decisions, with rationale where useful. -->
## Assumptions
## Open questions
```

Keep evidence distinct: implemented facts (from the repository), user decisions (from the interview), and labeled assumptions and unknowns. On the light track, the brief may be short: problem, the specified behavior being restored (with the scenario that specifies it), acceptance checklist, current behavior, assumptions, and open questions.
