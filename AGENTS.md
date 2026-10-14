# Agent guidance

This is the shared way of working for every repository that uses the rpi skill suite. It is maintained in the myRPI repository and installed into applications together with the suite.

## Read first

1. Read [AGENTS_APP.md](AGENTS_APP.md) now, before working. It holds everything specific to this repository: what the application is, its commands and project rules, and the "Feature workflow" configuration. Where it is more specific than this file, it takes precedence for this repository.
2. Before planning or changing the application, read its architecture document: the `architecture` path in the "Feature workflow" configuration of `AGENTS_APP.md`, if one is set. It is the source of truth for the product assumptions, architecture, and technology choices.

This file is replaced by a clean copy from myRPI on every suite update; outside myRPI, never edit it, because changes made here are lost on the next update. Write every new or changed repository-specific instruction to `AGENTS_APP.md`. If an instruction would improve the shared way of working for every repository, say so and propose it for `AGENTS.md` in myRPI instead.

## Day-to-day work

- Use `Taskfile.yml` as the canonical entry point for installing, running, building, and testing; prefer `task <name>` over invoking package scripts or tools directly. The project uses the Task runner from [taskfile.dev](https://taskfile.dev/); if the `task` command is unavailable, install the runner using its official installation instructions.
- Common commands are `task install`, `task dev` (or `task run`), `task test`, `task test:e2e`, `task check`, and `task build`, as far as the project defines them; `AGENTS_APP.md` lists the project's own. Install the end-to-end test browsers with `task test:e2e:install` before running browser tests when the project has them and they are not already available. Run the relevant tests and checks for every change.
- Keep the Taskfile commands aligned with the scripts of the projects it wraps as they are added or changed. If a required task or script is not available, report that explicitly rather than claiming it ran.
- All automated tests live under `test/`, apart from the code they test, and the projects contain no test code: `test/<project>` holds the unit and component tests of each project, and `test/e2e` holds the browser tests that run the projects together. Inside each, group tests by the feature area they cover, with shared helpers in `support/`. Test domain rules independently from the UI, and cover persistence and offline behavior at their boundaries.
- Do not commit secrets, credentials, or private user data.

## Feature workflow

- Feature work uses the rpi skill suite (`rpi-init`, `rpi-refine`, `rpi-plan`, `rpi-implement`, `rpi-grill-me`). Its lifecycle is defined once in the `rpi-workflow` skill (`references/lifecycle.md`); do not restate it in the guidance files.
- The workflow's configuration (feature folders, architecture document, verification commands, test mapping, and git rules) has values that belong to each repository, so it lives in the "Feature workflow" section of `AGENTS_APP.md`. Its schema is in the `rpi-workflow` skill (`references/configuration.md`); `rpi-init` creates and updates it.
- The suite and this file are edited only in the myRPI repository. In any other repository, do not edit the `rpi-*` skill folders or this file. `task rpi:update` replaces both with the current version, running the installer that lives in myRPI; `task rpi:check` checks the installed suite and the configuration.

## Ideas

`docs/IDEAS.md` is the user's parking lot for ideas they want to remember but have no time to implement yet.

- When the user asks to add, note, or remember an idea, add it as a bullet at the top of the "Backlog" list in `docs/IDEAS.md` (create the file with a `## Backlog` list if it does not exist). Do not use the memory feature, the feature folders, or any other file for this.
- Entries are not requirements, plans, or commitments. Do not implement them, treat them as project assumptions, or start the feature workflow for them unless the user asks. When the user picks one up, remove it from the list once its feature work begins.

## Memory and agent instructions

- Do not use the memory feature at all. This is a hard restriction.
- If a change or fact could be considered for memory storage, do not add it to memory; ask the user to confirm that it is reusable information.
- After the user confirms, write it as a permanent instruction to `AGENTS_APP.md` when it concerns this repository only, or propose it for the shared `AGENTS.md` in myRPI when it concerns the way of working everywhere.
- `AGENTS_APP.md` is the canonical place for durable, user-approved instructions specific to this repository; this file is the canonical place for the shared ones.
