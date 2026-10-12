# Changelog

The suite follows semantic versioning. The versioned contract is the skill frontmatter, the `(capability: <name>)` marker, the "Feature workflow" configuration schema, and the script command lines. A breaking change to any of them is a new major version.

## 2.0.0 — 2026-10-12

Breaking: the suite folders now hold only what applications need.

- The agent eval cases, fixtures, eval runner, and the suite's own tests moved out of `skills/` to `test/` in this repository, so they are no longer installed into applications. `rpi-workflow/scripts/run-evals.mjs` and the `check-suite.mjs --feature` option are gone from the suite (the eval runner and the eval coverage check are now `test/evals/run-evals.mjs` and `test/evals/check-coverage.mjs`), and the eval case schema and `agent_evals` settings are documented in `test/README.md` instead of the suite's configuration reference. Applications set `suite_version: 2.0.0`; no other configuration change is needed.
- Installing the suite now removes the eval and test files from an application that has an older copy.

Also in this release (a feature that was prepared as 1.1.0 and never released):

- New optional configuration key `features.specifications`: a folder for the living behavior specification. When set, archiving moves a feature's `.feature` files there and the brief and plan to `features.completed`; amendments, conflict checks, overlap reviews, and slug checks read completed scenarios from that location. When omitted, behavior is unchanged (the `.feature` files stay with the completed feature).
- The suite check validates the new key, treats its value as application-specific, and keeps it out of guidance outside the configuration section.
- New behavior scenarios (one static, one agent) with eval case A40 and the `configured-specs` fixture.

## 1.0.0 — 2026-10-11

First release.

- Six skills: `rpi-init`, `rpi-refine`, `rpi-plan`, `rpi-implement`, `rpi-grill-me`, and the reference-only `rpi-workflow`.
- Harness-neutral skill text with a capability vocabulary and defined fallbacks.
- Per-repository configuration in the `## Feature workflow` section of `AGENTS.md`.
- One shared lifecycle: brief and plan frontmatter, plan statuses `draft`, `blocked`, `ready`, `approved`, `in-progress`, `verified`, write scopes, approval, verification, and archive gates, resumable progress, brief drift detection, a light path, amendments to completed features, and legacy-artifact handling.
- `rpi-init` existing-project configuration and new-project bootstrap (guidance, architecture, shell, health checks, `project-shell` feature).
- Static suite check, agent eval runner with 39 cases and fixtures, and installer that applications run to pull the suite from this repository (Node.js, no dependencies).
