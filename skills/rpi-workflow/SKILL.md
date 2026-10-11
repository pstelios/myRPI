---
name: rpi-workflow
description: "Shared reference for the rpi feature-workflow suite (rpi-init, rpi-refine, rpi-plan, rpi-implement, rpi-grill-me): the lifecycle, capability vocabulary, configuration schema, artifact templates, eval cases, and suite scripts. Read by the other rpi skills; not a workflow to run on its own."
user-invocable: false
metadata:
  suite: rpi
  version: 1.0.0
---

# RPI Workflow Reference

This skill holds the material that every rpi skill shares. It defines things once so that the workflow skills can refer to them instead of restating them. Do not run it as a workflow. If a user asks for it directly, explain which workflow skill fits their goal: `rpi-init` (set up), `rpi-refine` (requirements), `rpi-plan` (plan and scenarios), `rpi-implement` (build and verify), or `rpi-grill-me` (stress-test a decision).

## Contents

| File | Defines |
|---|---|
| [references/lifecycle.md](references/lifecycle.md) | Artifacts, statuses, transitions, write scopes, gates, progress, drift, light path, amendments, legacy artifacts, git rules |
| [references/capabilities.md](references/capabilities.md) | The capability vocabulary: what each environment capability must do and its fallback |
| [references/configuration.md](references/configuration.md) | The repository's "Feature workflow" configuration section |
| [references/brief-template.md](references/brief-template.md) | Refinement brief template |
| [references/plan-template.md](references/plan-template.md) | Implementation plan template, with required and optional sections |
| [references/guidance-template.md](references/guidance-template.md) | Guidance file skeleton for a new project |
| [references/architecture-template.md](references/architecture-template.md) | Architecture document skeleton for a new project |
| [references/new-project.md](references/new-project.md) | New-project interview topics, project shell, and health checks |
| `evals/` | Agent eval cases and fixture repositories, versioned with the suite |
| `scripts/` | Suite check, agent eval runner, and installer (Node.js, no dependencies) |

## Suite scripts

Run these from the repository root with Node.js. Paths are relative to this skill folder.

- `scripts/check-suite.mjs [--repo <root>] [--suite-only] [--feature <file>]`: static checks of the suite and of the repository's configuration. Prints `<file>:<line> <rule> <message>` per finding and exits 1 when there are findings.
- `scripts/run-evals.mjs [--case <id>] [--harness <name>] [--report <file>] [--jobs <n>] [--keep]`: runs the agent eval cases in every harness configured under `agent_evals`, each in a temporary fixture repository outside the project, and writes a results report.
- `scripts/install-suite.mjs --to <skills-dir> [--repo <root>]`: run from the receiving project with the script of the source copy. Mirrors the suite folders into `<skills-dir>` (other skills there are untouched) and checks the installed copy, including the project's configuration when `--repo` is given.

## Versioning

Every suite skill declares `metadata.suite: rpi` and the same `metadata.version`. The frontmatter, the capability marker `(capability: <name>)`, the configuration schema, the eval case schema, and the script command lines are versioned together. A breaking change to any of them requires a new major version.
