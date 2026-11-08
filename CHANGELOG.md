# Changelog

The suite follows semantic versioning. The versioned contract is the skill frontmatter, the `(capability: <name>)` marker, the "Feature workflow" configuration schema, and the script command lines. A breaking change to any of them is a new major version.

## 3.1.0 — 2026-11-08

The configuration is reviewed against release notes after every suite update, and `suite_version` records that review.

- New `rpi-workflow/references/configuration-changes.md` in the suite: one section per release saying what an application changes in its "Feature workflow" configuration, or "None.". Every changelog entry has a "Configuration changes" subsection with the same text; the suite check (new `release-notes` rule) fails when a version lacks it or the two differ.
- `suite_version` now means the suite version the configuration was last reviewed against. `rpi-init` sets it whenever the user confirms a review and never needs a manual edit. The suite check (new `config-review` rule) fails whenever the installed suite is newer than `suite_version`, whatever the release notes list (they are named in the message when they list changes), and also fails a `suite_version` that is newer than the installed suite or not a semantic version. It replaces the major-version warning: the workflow skills now warn whenever `suite_version` differs from the suite version.
- `rpi-init` in an existing project reviews the configuration against those release notes: it names the release behind each proposed difference, sets `suite_version`, and writes only after confirmation. When nothing else changes, confirming only records the review.
- `task rpi:update` always points to `rpi-init` when the configuration's `suite_version` is older than the installed suite, and prints the configuration changes of the releases since then (or says none are listed). Without a configuration it prints the changes since the previously installed version.
- The suite check separates warnings from findings. Drift from the myRPI checkout (the `up-to-date` rule: an installed suite or shared `AGENTS.md` that differs from myRPI's) is now a warning with `warning:` before the message and does not fail the check; inconsistencies inside the project, including a configuration that is due for review, still fail it. `task rpi:update` succeeds when the only open point is that review and tells the user to run `rpi-init`.
- `rpi-init` ends every setup (existing-project and new-project mode) by running the suite check the shared guidance names, and does not call the setup complete while it reports findings.
- New behavior scenarios (static and agent) with eval case A42 and a fixture change; the myRPI release rule in `AGENTS_APP.md` requires the subsection for every release.

### Configuration changes

None. No key is added, renamed, or removed. `suite_version` now records the suite version the configuration was last reviewed against: `rpi-init` sets it when the user confirms a review, and the suite check fails until the review is done whenever the installed suite is newer.

## 3.0.1 — 2026-11-08

- `rpi-grill-me` asks each question once: it does not restate or rephrase a question, or move on to the next decision, until the user has answered.
- The suite check reports an installed copy that is out of date (new `up-to-date` rule). When the checked suite is not myRPI's own `skills/`, it compares it with the suite of the myRPI checkout that runs the check: a different version is reported once (older: run `task rpi:update`; newer: update the myRPI checkout), and at the same version every changed, missing, or extra file is reported. In repository mode it also reports a shared `AGENTS.md` that differs from myRPI's. Line endings are ignored. Applications need no configuration change apart from `suite_version: 3.0.1`.
- Eval cases A16 and A38 accept more phrasings of the same behavior.

### Configuration changes

None. The suite check now reports an installed copy that is out of date; the configuration is unchanged.

## 3.0.0 — 2026-10-14

Breaking: project guidance is split into a shared file and an application file, and the configuration moves.

- `AGENTS.md` is now the shared way of working, maintained in myRPI and installed into applications with the suite; every update replaces it with a clean copy. It tells agents to read `AGENTS_APP.md` and to write repository-specific instructions there.
- `AGENTS_APP.md` holds everything specific to one repository, including the `## Feature workflow` configuration. The skills, the suite check, and the eval runner read the configuration from it. Move the section (and any other application-specific guidance) from `AGENTS.md` to `AGENTS_APP.md` and set `suite_version: 3.0.0`.
- The installed suite holds no scripts any more: the installer and the suite check (with their libraries) moved to myRPI's `scripts/`, so applications always run the code of the checkout they pull from. Update the application's `rpi:update` task to `node <myRPI>/scripts/install-suite.mjs --to <skills> --repo .` and add `rpi:check` (`node <myRPI>/scripts/check-suite.mjs --suite <skills> --repo .`); see `templates/Taskfile.yml`. With `--repo`, the installer also installs `AGENTS.md`, creates `AGENTS_APP.md` when missing, and refuses (changing nothing) while `AGENTS.md` still holds the application's own content. Before the configuration exists, it checks only the suite.
- New `task rpi:init` in myRPI: asks for a project name and creates the project next to myRPI with only the skills, `AGENTS.md`, an `AGENTS_APP.md` placeholder, and a Taskfile with `rpi:update` and `rpi:check`; `rpi-init` then sets the project up and adds its tasks to that Taskfile.
- `rpi-init` writes the configuration and new projects' guidance to `AGENTS_APP.md`; agent entry files point only to `AGENTS.md`, which tells agents to read `AGENTS_APP.md` and the architecture document.
- Three new static scenarios cover installing the shared guidance and creating a new project; eval fixtures and cases use `AGENTS_APP.md`, and the runner puts the shared `AGENTS.md` into each fixture.

Also in this release:

- `rpi-plan` presents a proposed architecture-document change as a change summary before asking for the user's decision: per affected section, what it says now, what it would say, and why, followed by the consequences.
- `rpi-plan` also reviews the project readme the same way and asks the user to confirm "no readme change" or the summarized change. Plans have a new required `## Readme review` section, and both review sections record the confirmed summary.
- `rpi-implement` may change the architecture document and the readme where the approved plan lists the change.
- New behavior scenario with eval case A41 and the `remote-brief` fixture; A24 also checks the new section.

### Configuration changes

Move the `## Feature workflow` section, and any other application-specific guidance, from `AGENTS.md` to `AGENTS_APP.md`. Every update replaces `AGENTS.md` with the shared guidance. Add the `rpi:update` and `rpi:check` tasks to the project's Taskfile, as in the Taskfile that a new project gets from the source repository.

## 2.0.0 — 2026-10-12

Breaking: the suite folders now hold only what applications need.

- The agent eval cases, fixtures, eval runner, and the suite's own tests moved out of `skills/` to `test/` in this repository, so they are no longer installed into applications. `rpi-workflow/scripts/run-evals.mjs` and the `check-suite.mjs --feature` option are gone from the suite (the eval runner and the eval coverage check are now `test/evals/run-evals.mjs` and `test/evals/check-coverage.mjs`), and the eval case schema and `agent_evals` settings are documented in `test/README.md` instead of the suite's configuration reference. Applications set `suite_version: 2.0.0`; no other configuration change is needed.
- Installing the suite now removes the eval and test files from an application that has an older copy.

Also in this release (a feature that was prepared as 1.1.0 and never released):

- New optional configuration key `features.specifications`: a folder for the living behavior specification. When set, archiving moves a feature's `.feature` files there and the brief and plan to `features.completed`; amendments, conflict checks, overlap reviews, and slug checks read completed scenarios from that location. When omitted, behavior is unchanged (the `.feature` files stay with the completed feature).
- The suite check validates the new key, treats its value as application-specific, and keeps it out of guidance outside the configuration section.
- New behavior scenarios (one static, one agent) with eval case A40 and the `configured-specs` fixture.

### Configuration changes

New optional key `features.specifications`: a folder for the living behavior specification. Add it only when behavior specifications are kept apart from the feature documents (archiving then moves a feature's `.feature` files there); otherwise nothing changes.

## 1.0.0 — 2026-10-11

First release.

- Six skills: `rpi-init`, `rpi-refine`, `rpi-plan`, `rpi-implement`, `rpi-grill-me`, and the reference-only `rpi-workflow`.
- Harness-neutral skill text with a capability vocabulary and defined fallbacks.
- Per-repository configuration in the `## Feature workflow` section of `AGENTS.md`.
- One shared lifecycle: brief and plan frontmatter, plan statuses `draft`, `blocked`, `ready`, `approved`, `in-progress`, `verified`, write scopes, approval, verification, and archive gates, resumable progress, brief drift detection, a light path, amendments to completed features, and legacy-artifact handling.
- `rpi-init` existing-project configuration and new-project bootstrap (guidance, architecture, shell, health checks, `project-shell` feature).
- Static suite check, agent eval runner with 39 cases and fixtures, and installer that applications run to pull the suite from this repository (Node.js, no dependencies).

### Configuration changes

None. First release.
