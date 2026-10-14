---
name: rpi-workflow
description: "Shared reference for the rpi feature-workflow suite (rpi-init, rpi-refine, rpi-plan, rpi-implement, rpi-grill-me): the lifecycle, capability vocabulary, configuration schema, and artifact templates. Read by the other rpi skills; not a workflow to run on its own."
user-invocable: false
metadata:
  suite: rpi
  version: 3.0.0
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
| [references/guidance-template.md](references/guidance-template.md) | Application guidance file skeleton for a new project |
| [references/architecture-template.md](references/architecture-template.md) | Architecture document skeleton for a new project |
| [references/new-project.md](references/new-project.md) | New-project interview topics, project shell, and health checks |

## Installing and checking

The installed suite holds no scripts. The suite's source repository installs and updates it, together with the shared guidance file, and provides the suite check: static checks of the installed suite and of the repository's configuration, one `<file>:<line> <rule> <message>` line per finding. The shared guidance file names the commands that run them in this repository.

## Versioning

Every suite skill declares `metadata.suite: rpi` and the same `metadata.version`. The frontmatter, the capability marker `(capability: <name>)`, the configuration schema, and the command lines of the source repository's installer and suite check are versioned together. A breaking change to any of them requires a new major version.
