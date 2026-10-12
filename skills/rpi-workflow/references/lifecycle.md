# Feature lifecycle

This is the single definition of the rpi feature workflow. The workflow skills and the repository's guidance file refer to it instead of restating it. Repository-specific values (folders, documents, commands, test tools, git rules) come from the configuration described in [configuration.md](configuration.md). Environment interactions use the capabilities in [capabilities.md](capabilities.md).

## Method

These rules apply in every repository and cannot be configured away:

1. Every feature has Gherkin behavior scenarios. Gherkin files are specifications, not executable step definitions.
2. Automated tests are written before the application behavior they verify, and are seen to fail first where that is meaningful.
3. Every scenario, and every example of a scenario outline, is linked to one recognizable automated test or eval case. Test and case names equal or clearly contain the scenario name.
4. A plan is implemented only after the user explicitly approves it. A feature is archived only after the user explicitly confirms it.

Only the tools, commands, and paths vary by repository; they come from `test_mapping` and `verification` in the configuration.

## Preflight (every workflow skill)

Before anything else, `rpi-refine`, `rpi-plan`, and `rpi-implement`:

1. Read the guidance file `AGENTS.md` at the repository root and its `## Feature workflow` section (capability: file-read).
2. If the file, the section, or any required key is missing or unparsable, change nothing and stop with: "Feature workflow configuration is missing. Run rpi-init first." Name what is missing. Do not guess folders, commands, or tools.
3. Compare the configuration's `suite_version` with the skill's `metadata.version`. If the major versions differ, warn and ask whether to continue (capability: structured-question).
4. Read this file and [capabilities.md](capabilities.md) (capability: skill-reference).

## Artifacts

A feature has a lowercase kebab-case slug. All of its artifacts live in one folder named after the slug:

| Artifact | File | Written by |
|---|---|---|
| Refinement brief | `<slug>-info.md` | `rpi-refine` |
| Implementation plan | `<slug>-plan.md` | `rpi-plan`; `rpi-implement` updates its status, progress, and implementation changes |
| Behavior scenarios | `<slug>.feature` | `rpi-plan`; `rpi-implement` for agreed changes |

While a feature is in progress, its folder is `<features.working>/<slug>/`. After the archive gate, the folder moves to `<features.completed>/<slug>/`.

The behavior scenarios can live apart from the rest of a completed feature. When the configuration sets `features.specifications`, the archive gate moves each of the feature's `.feature` files to `<features.specifications>/<slug>/` instead, and the brief and plan stay in the completed folder. That folder then holds the living behavior specification. Without the key, the `.feature` files stay in the completed folder. A completed feature's **specification location** is `<features.specifications>/<slug>/` when the key is set, and `<features.completed>/<slug>/` otherwise. Everything that reads or edits a completed feature's scenarios uses its specification location.

A slug is never reused for different work. Before creating a folder, check the working, completed, and specification locations for the same or a similar slug.

## Brief frontmatter

```yaml
---
status: draft            # draft | confirmed
track: full              # full | light
created_at: "YYYY-MM-DDTHH:MM:SSZ"
updated_at: "YYYY-MM-DDTHH:MM:SSZ"
revision: 1
---
```

- `confirmed`: the user confirmed the summary of a finished interview. `draft`: the interview stopped early or the user has not confirmed it; open questions list every unresolved decision.
- `revision` starts at 1 and increases by exactly 1 on each write after a user confirmation. `created_at` never changes after the first write; `updated_at` changes on every write. Use the current UTC time in ISO 8601.

## Plan frontmatter and statuses

```yaml
---
status: draft            # draft | blocked | ready | approved | in-progress | verified
created_at: "YYYY-MM-DDTHH:MM:SSZ"
description: "One-sentence implementation goal."
brief_revision: 1        # the brief revision this plan is based on
suite_version: 1.1.0     # the suite version that wrote the plan
base_commit: <optional commit id the plan was written against>
---
```

| Status | Meaning | Set by |
|---|---|---|
| `draft` | Planning is in progress, or the plan changed after being `ready` | `rpi-plan` |
| `blocked` | A required decision or prerequisite is outstanding; the plan says which | `rpi-plan` |
| `ready` | Scenarios, reviews, and plan are complete; awaiting the user's approval | `rpi-plan` |
| `approved` | The user explicitly approved this plan | `rpi-plan` or `rpi-implement`, only on explicit approval |
| `in-progress` | Implementation has started | `rpi-implement` |
| `verified` | Every scenario passes and every required check passed | `rpi-implement` |

Transitions: `draft → ready → approved → in-progress → verified`, then archive (confirmation-gated). `blocked` can be entered from `draft` or `ready` and returns to `draft` when resolved. Any change to a `ready` or `approved` plan's content returns it to `draft`, except the status, progress, and implementation-changes updates that `rpi-implement` makes. Never infer approval from silence, from a `ready` status, or from a request to plan or implement. Reopening a `verified` or archived feature needs the user's explicit confirmation.

## Write scopes

A skill writes only what its row allows (capability: file-write). Everything else is read-only for it. If work outside the scope is needed, record it (as an open question, plan dependency, or implementation change) and leave it for the right skill.

| Skill | May write |
|---|---|
| `rpi-init`, existing project | The guidance file's `## Feature workflow` section |
| `rpi-init`, new project | Only in an empty repository: the guidance file, the architecture document, the project shell and its task-runner entries, the health-check tests, the completed `project-shell` feature, and the agent entry files the user named |
| `rpi-refine` | Its feature's brief (and the feature folder, when new) |
| `rpi-plan` | Its feature's plan and `.feature` file |
| `rpi-implement` | Application code and tests; its plan's status, implementation progress, and implementation changes; its `.feature` file (with the change tag below); completed features' `.feature` files, in their specification location, where the approved plan lists the change; the archive move after confirmation |
| `rpi-grill-me` | Nothing |

The brief is read-only for every skill except `rpi-refine`.

## Gates

**Explicit confirmation.** Every gate below that needs the user's confirmation or approval (writing a brief or configuration, writing a new project, approving a plan, archiving) needs a reply that clearly accepts that specific action, such as "I confirm the summary" or "I approve the plan". A generic reply such as "use the recommended option", "continue", or "ok" settles an interview question but does not pass a gate, even when the recommended choice is to proceed; ask for explicit confirmation instead.

- **Configuration gate:** no workflow skill runs without the configuration (see Preflight).
- **Predecessor gate:** `rpi-plan` needs a brief and `rpi-implement` needs a plan. When the predecessor is missing, the skill changes nothing and tells the user which skill to run: "Run rpi-refine for <slug> first." or "Run rpi-plan for <slug> first." It does not run the other phase itself.
- **Approval gate:** `rpi-implement` changes nothing in the application or tests unless the plan status is `approved`, `in-progress`, or `verified` (resumed work). For any other status, it summarizes the plan and asks for explicit approval; only an explicit yes allows it to set `approved` and continue.
- **Verification gate:** a plan becomes `verified` only when every scenario's test or eval case passes and every command in `verification.full`, plus the `command` of every test kind the feature uses, passed in this session. A check that was not run is reported as not run.
- **Archive gate:** after verification, ask whether to move the feature folder to `<features.completed>/<slug>/` (with its `.feature` files going to `<features.specifications>/<slug>/` when `features.specifications` is set). Move it only after explicit confirmation, meaning a reply that asks for this feature to be archived; a generic reply such as "use the recommended option" is not confirmation. Otherwise leave it in place and report that archiving is pending.
- **Hand-off:** each phase ends by naming the next skill for a fresh session (capability: session-handoff). No skill continues into the next phase.

## Implementation progress

Every plan has an `## Implementation progress` table with one row per scenario and outline example:

| Scenario | Test / eval case | State |
|---|---|---|
| <scenario name> | <test file and test name, or case id> | todo |

States are `todo`, `failing` (test written, behavior missing or broken), and `passing`. `rpi-implement` updates the table as each state changes, so an interrupted session leaves an accurate record. A new session resumes from the table: it verifies that rows marked `passing` still pass, keeps their tests unchanged, and continues with the first row that is not `passing`.

## Drift

Before implementing, `rpi-implement` compares the brief's `revision` with the plan's `brief_revision`. If the brief is newer, it reports "Brief drift: the brief is at revision <n>, the plan was based on revision <m>." before changing anything, and asks the user whether to re-plan (recommended) or continue. It also reports changes since `base_commit` (when recorded) to files the plan expects to change.

## Light path

A change qualifies for the light track only when all of these hold:

1. It restores behavior that an existing scenario or the brief already specifies, or it does not change behavior at all (for example, documentation or an internal refactor);
2. it changes no public contract or interface, no persisted data shape, no configuration schema, and no security boundary;
3. it affects no other feature's scenarios.

On the light track, the interview covers only what the fix needs, and the plan contains only its required sections, kept short. These are never skipped: a regression scenario with an automated test, plan approval, and full verification.

When the user asks for the light path and a criterion fails, say "This change does not qualify for the light path because <criterion>; continuing with the full track." and continue on the full track. A brief on the light track records `track: light`.

## Changes to completed features

Completed features are the living behavior specification, and their scenarios are in their specification location. A later feature may change a completed feature's scenarios only when its approved plan lists that change. `rpi-implement` then edits the completed `.feature` file in that location, tags each changed scenario `@amended-by-<slug>`, and adds a Gherkin comment above it that states what changed and why. A needed change that the plan does not list is recorded under "Implementation changes from approved plan" and applied only after the user decides.

## Implementation changes from approved plan

When implementation shows that the approved plan or behavior must change, `rpi-implement` records it in the plan under `## Implementation changes from approved plan`: the affected section, file, or scenario; the approved intent; the proposed change; the reason; and the user's decision. A changed scenario in the feature's own `.feature` file gets the `@changed-from-approved` tag and a comment explaining the change, and its test is updated in the same change. A material behavior or scope change needs the user's decision before it is implemented. Never delete, skip, or weaken a failing test to get a passing result.

## Legacy artifacts

Briefs and plans written before this lifecycle may lack frontmatter or fields (`status`, `revision`, `brief_revision`, `suite_version`, the progress table). Skills accept them. Before relying on them, say "Legacy artifact: <file> is missing <fields>." and name the consequence (for example, drift detection is unavailable without `brief_revision`). Ask before adding the missing fields; never rewrite a legacy artifact without permission.

## Git rules

Skills follow `git.commit`, `git.push`, and `git.branch` from the configuration (capability: version-control): `never` forbids the action, `when-asked` allows it only when the user explicitly asks in the current session, and `allowed` permits it as part of the workflow. Inspecting the working tree is always allowed. Preserve unrelated changes in the working tree.
