# Architecture document template

`rpi-init` writes the new project's architecture document from this skeleton. Record decisions from the interview as decisions and everything else as recommendations or open decisions. Keep it short; it grows with the project.

```markdown
# <Project name> — Architecture

## Goals and constraints

<What the project must achieve; platforms, offline, privacy, security, and performance constraints.>

## Technology

| Area | Choice | Status |
|---|---|---|
| Language and framework | <choice> | Decision |
| Unit or component tests | <tool> | Decision |
| End-to-end tests | <tool or none> | Decision |
| Task runner and package manager | <choice> | Decision |
| Data and storage | <choice or none> | Decision |
| Deployment | <target or not decided> | <Decision or Open> |

## Structure

<Source layout and module responsibilities of the shell; where tests live; the boundaries later features should respect.>

## Data

<What is stored where, and its format and versioning; or "No persisted data.">

## Quality attributes

<Testing approach (the health checks are the first tests), accessibility, observability, and security expectations.>

## Open decisions

<Decisions deferred during setup, or "None.">
```
