# Agent entry files

The suite keeps project guidance in two files at the repository root: the shared `AGENTS.md`, installed from myRPI, and the project's own `AGENTS_APP.md`, which also holds the "Feature workflow" configuration. `AGENTS.md` is the single starting point: it tells agents to read `AGENTS_APP.md`, so pointer files name only `AGENTS.md`. Agent environments differ in which file they read first. Give each one a short pointer file instead of a copy, so there is a single source of truth.

| Environment | Reads | Suggested pointer |
|---|---|---|
| GitHub Copilot (CLI and VS Code) | `AGENTS.md` and `.github/copilot-instructions.md` | `.github/copilot-instructions.md`: "Before making changes, read the repository-root `AGENTS.md`. It contains the project guidance." |
| Claude Code | `CLAUDE.md` (it can import other files with `@path`) | `CLAUDE.md`: "Use `AGENTS.md` as the project guidance." followed by `@AGENTS.md` |
| Other `AGENTS.md`-aware agents | `AGENTS.md` | None needed (`AGENTS.md` points to `AGENTS_APP.md`) |

`rpi-init` in new-project mode creates the pointer files you name during its interview. Each pointer stays a few lines long and does not repeat the guidance.
