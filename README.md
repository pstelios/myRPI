# myRPI

A portable, harness-neutral skill suite for a requirement-driven feature workflow: **refine → plan → implement**, with Gherkin scenarios, test-first implementation, explicit plan approval, and confirmation-gated archiving. It follows the open Agent Skills `SKILL.md` conventions and is verified in Claude Code and the GitHub Copilot CLI.

| Skill | Purpose |
|---|---|
| `rpi-init` | Set up the workflow configuration in an existing repository, or bootstrap a new project (application guidance file, architecture document, project shell with health checks) through an interview |
| `rpi-refine` | Turn a feature idea into a confirmed, versioned refinement brief |
| `rpi-plan` | Write Gherkin scenarios and an implementation plan from a confirmed brief, and get it approved |
| `rpi-implement` | Implement an approved plan test-first, keep progress resumable, verify, and archive on confirmation |
| `rpi-grill-me` | The interview protocol (also usable on its own to stress-test a decision) |
| `rpi-workflow` | Shared reference: lifecycle, capability vocabulary, configuration schema, templates, and scripts |

The current version is in each skill's `metadata.version` and in [CHANGELOG.md](CHANGELOG.md).

## Start a new project

In myRPI, run `task rpi:init`. It asks for the project name and creates the project next to this checkout (or `task rpi:init -- <name> [--dir <parent-folder>]`) with only what it needs:

```text
.claude/skills/rpi-*   the skills and their reference documents (no scripts)
AGENTS.md              the shared way of working
AGENTS_APP.md          a placeholder for the project's own guidance
Taskfile.yml           rpi:update and rpi:check, which run myRPI's installer and suite check
```

Then open the project with your agent and start the `rpi-init` skill: it runs the new-project interview and writes the project's guidance, architecture document, shell with health checks, task-runner entries, and "Feature workflow" configuration.

## Install in an existing project

1. Add the `rpi:update` and `rpi:check` tasks of [templates/Taskfile.yml](templates/Taskfile.yml) to the project's Taskfile (replace `__RPI_SOURCE__` with the path to this checkout and `__RPI_SKILLS__` with the skill location, for example `.claude/skills`, loaded by Claude Code and by GitHub Copilot) and run `task rpi:update`. It copies every `skills/rpi-*` folder into the skill location and the shared guidance file `AGENTS.md` into the project root, and creates `AGENTS_APP.md` for the project's own guidance. Keep exactly one copy of the suite in a project.
2. In the project, start the `rpi-init` skill. It inspects the repository and proposes a "Feature workflow" section for `AGENTS_APP.md`, and writes it only after you confirm.
3. Make sure your agent reads `AGENTS.md`; it tells the agent to read `AGENTS_APP.md` (see [examples/agent-entry-files.md](examples/agent-entry-files.md)).
4. Start features with `rpi-refine`, then `rpi-plan`, then `rpi-implement`, each in a fresh session.

To upgrade, run `task rpi:update` again. It replaces the `rpi-*` folders and `AGENTS.md`; the project's own guidance and configuration live in `AGENTS_APP.md`, which the installer never overwrites. Check the changelog for configuration changes when the major version changes.

## Two guidance files

| File | Holds | Edited in |
|---|---|---|
| `AGENTS.md` | The shared way of working that applies to every project: what to read first, day-to-day rules (Taskfile, tests, checks), the feature workflow, ideas, and memory rules | myRPI only; projects get a clean copy on every update |
| `AGENTS_APP.md` | Everything specific to one project: what it is, its own commands and project rules, and the "Feature workflow" configuration (whose values, such as folders and test commands, differ per project) | The project |

`AGENTS.md` is the only starting point: agent entry files such as `CLAUDE.md` point to it, and it tells agents to read `AGENTS_APP.md` and to write project-specific instructions there, so an update never loses them. The installer refuses to replace a project's `AGENTS.md` that still holds its own content until that content has moved to `AGENTS_APP.md`.

## Checking a project

With Node.js installed (no dependencies), run `task rpi:check` in the project, or from the project root:

```sh
node <myRPI>/scripts/check-suite.mjs --suite <skill-location> --repo .
```

It checks the suite (names, shared version, no harness-specific or project-specific text, every capability defined with a fallback) and the project (configuration present and complete, no duplicated lifecycle text, one copy of the suite). Use `--suite-only` to check just the suite.

## Agent evals

The suite is verified by automated agent evals. The cases, fixture repositories, and runner are myRPI's own tests: they live in `test/evals/` and are not installed into applications. See [test/README.md](test/README.md).

## This repository

```text
skills/     the suite; installed into applications
AGENTS.md   the shared guidance; installed into applications (myRPI's own guidance is AGENTS_APP.md)
scripts/    the installer, the suite check, and rpi:init's project setup, run from this checkout
templates/  the Taskfile that new projects get
test/       myRPI's own tests: test/suite (node:test), test/evals (agent eval cases, fixtures, runner)
docs/       the suite's behavior specification and the agent eval results
examples/   examples for applications
```

This is the **only editing source** of the suite and the shared guidance. Applications never edit their copies; they pull the current version from here, from the application side, so the installer that runs is always the one in this checkout:

```sh
node <myRPI>/scripts/install-suite.mjs --to <app skill location> --repo .
```

The installer mirrors every `rpi-*` folder (it overwrites them and deletes files that no longer exist here, leaving other skills alone), replaces the application's `AGENTS.md`, creates its `AGENTS_APP.md` when missing, and then checks the installed suite and the application's configuration. Applications run it through their `task rpi:update` (see [templates/Taskfile.yml](templates/Taskfile.yml)).

Agent evals run from this repository (`task test:agents`). Run them before releasing a new suite version and after harness updates; a pass stays valid only while the suite, the cases, and the harness versions are unchanged. Bump `metadata.version` in all six skills and add a changelog entry for every release.
