# myRPI

A portable, harness-neutral skill suite for a requirement-driven feature workflow: **refine → plan → implement**, with Gherkin scenarios, test-first implementation, explicit plan approval, and confirmation-gated archiving. It follows the open Agent Skills `SKILL.md` conventions and is verified in Claude Code and the GitHub Copilot CLI.

| Skill | Purpose |
|---|---|
| `rpi-init` | Set up the workflow configuration in an existing repository, or bootstrap a new project (guidance file, architecture document, project shell with health checks) through an interview |
| `rpi-refine` | Turn a feature idea into a confirmed, versioned refinement brief |
| `rpi-plan` | Write Gherkin scenarios and an implementation plan from a confirmed brief, and get it approved |
| `rpi-implement` | Implement an approved plan test-first, keep progress resumable, verify, and archive on confirmation |
| `rpi-grill-me` | The interview protocol (also usable on its own to stress-test a decision) |
| `rpi-workflow` | Shared reference: lifecycle, capability vocabulary, configuration schema, templates, eval cases, and scripts |

The current version is in each skill's `metadata.version` and in [CHANGELOG.md](CHANGELOG.md).

## Install in a project

1. From the project, run the installer (see "This repository" below) to copy every `skills/rpi-*` folder into the project's skill location, for example `.claude/skills/` (loaded by Claude Code and by GitHub Copilot) or `.github/skills/` or `.agents/skills/` (GitHub Copilot). Keep exactly one copy of the suite in a project.
2. In the project, start the `rpi-init` skill. It inspects the repository and proposes a "Feature workflow" section for `AGENTS.md`, and writes it only after you confirm. In an empty repository it offers to set up a new project instead.
3. Make sure your agent reads `AGENTS.md` (see [examples/agent-entry-files.md](examples/agent-entry-files.md)).
4. Start features with `rpi-refine`, then `rpi-plan`, then `rpi-implement`, each in a fresh session.

To upgrade, replace the `rpi-*` folders with the newer version. The project's configuration lives in its own `AGENTS.md`, so it is not overwritten; check the changelog for configuration changes when the major version changes.

## Checking a project

With Node.js installed (no dependencies), run from the project root:

```sh
node <skill-location>/rpi-workflow/scripts/check-suite.mjs --repo .
```

It checks the suite (names, shared version, no harness-specific or project-specific text, every capability defined with a fallback) and the project (configuration present and complete, no duplicated lifecycle text, one copy of the suite). Use `--suite-only` to check just the suite.

## Agent evals

`rpi-workflow/evals/` contains automated agent eval cases with fixture repositories. `rpi-workflow/scripts/run-evals.mjs` runs each case non-interactively in every harness configured under `agent_evals` in the project's configuration, in temporary repositories outside the project, and writes a pass/fail report. See [examples/agent-evals.yaml](examples/agent-evals.yaml) for harness settings. Evals need network access, logged-in harness CLIs, and paid model usage.

## This repository

This is the **only editing source** of the suite. Applications never edit their copies; they pull the current version from here, from the application side:

```sh
node <myRPI>/skills/rpi-workflow/scripts/install-suite.mjs --to <app skill location> --repo .
```

The installer mirrors every `rpi-*` folder (it overwrites them and deletes files that no longer exist here, leaving other skills alone) and then checks the installed suite and the application's configuration. Wrap it in a task in each application, for example WordIn6's `task rpi:update`.

Agent evals run from an application that has the suite installed and `agent_evals` configured (WordIn6: `task test:agents`). Run them before releasing a new suite version and after harness updates; a pass stays valid only while the suite, the cases, and the harness versions are unchanged. Bump `metadata.version` in all six skills and add a changelog entry for every release.
