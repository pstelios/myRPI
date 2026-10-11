# Agent entry files

The suite keeps all project guidance, including the "Feature workflow" configuration, in `AGENTS.md` at the repository root. Agent environments differ in which file they read first. Give each one a short pointer file instead of a copy, so there is a single source of truth.

| Environment | Reads | Suggested pointer |
|---|---|---|
| GitHub Copilot (CLI and VS Code) | `AGENTS.md` and `.github/copilot-instructions.md` | `.github/copilot-instructions.md`: "Before making changes, read the repository-root `AGENTS.md`. It contains the project guidance." |
| Claude Code | `CLAUDE.md` (it can import other files with `@path`) | `CLAUDE.md`: "Use `AGENTS.md` as the shared project guidance." followed by `@AGENTS.md` |
| Other `AGENTS.md`-aware agents | `AGENTS.md` | None needed |

`rpi-init` in new-project mode creates the pointer files you name during its interview. Each pointer stays a few lines long and does not repeat the guidance.
