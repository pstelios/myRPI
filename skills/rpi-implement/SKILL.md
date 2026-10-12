---
name: rpi-implement
description: "Implement an approved feature plan test-first: link every Gherkin scenario to an automated test or eval case, keep the plan's progress current so work can resume, run full verification, and archive only after the user confirms. Use to implement or resume a planned feature. Part of the rpi workflow; follows rpi-plan."
argument-hint: "Name the feature or point to its implementation plan"
user-invocable: true
metadata:
  suite: rpi
  version: 2.0.0
---

# Implement an Approved Feature

Implement a feature from its brief, approved plan, and Gherkin scenarios. The plan and scenarios are the agreed scope: implement every scenario, keep tests and specifications aligned, and do not report completion until every required check passes.

The lifecycle, statuses, write scopes, gates, progress table, drift, amendments to completed features, implementation changes, legacy rules, and git rules are defined once in `../rpi-workflow/references/lifecycle.md`. Follow it; this file only adds what is specific to implementation.

## Write scope

`rpi-implement` may change (capability: file-write):

- application code and tests;
- its plan's `status`, `## Implementation progress`, and `## Implementation changes from approved plan`;
- its own `.feature` file, only for agreed changes tagged `@changed-from-approved`;
- completed features' `.feature` files, in their specification location, only where the approved plan lists the change (tagged `@amended-by-<slug>`);
- the feature folder's location, only for the confirmed archive move.

The brief is read-only. So are the guidance file, the architecture document, other features' artifacts, and the configuration, unless the approved plan lists the change as implementation work. Follow the configured git rules for commits, pushes, and branches (capability: version-control).

## 1. Preflight and selection

1. Run the lifecycle's preflight (capability: file-read). Without the configuration, change nothing and stop with "Feature workflow configuration is missing. Run rpi-init first."
2. Identify the feature in `<features.working>/`. If several match, ask which one (capability: structured-question). If the feature exists only as a completed feature (in `<features.completed>/` or its specification location), ask whether to reopen it and move it back, with its `.feature` files, only after explicit confirmation.
3. If the feature has no plan, change nothing and stop with "Run rpi-plan for <slug> first."
4. Read the brief, the plan, every `.feature` file in the folder, and the files the plan names, plus the relevant guidance, architecture, source, tests, and configuration. Inspect the working-tree state and preserve unrelated changes (capability: version-control).

## 2. Gates before any change

Check these in order and report every finding before changing anything:

1. **Legacy artifacts:** if the brief or plan lacks frontmatter or fields (`status`, `revision`, `brief_revision`, `suite_version`, the progress table), say "Legacy artifact: <file> is missing <fields>." with the consequence. Ask whether to add the missing fields (recommended: add only the progress table and `brief_revision`) and whether to continue. Do not edit either file until the user answers.
2. **Drift:** if the brief's `revision` is newer than the plan's `brief_revision`, report "Brief drift: the brief is at revision <n>, the plan was based on revision <m>." and ask whether to re-plan with `rpi-plan` (recommended) or continue. Also report changes since `base_commit` to files the plan expects to change.
3. **Approval:** continue only if the plan status is `approved`, or `in-progress` or `verified` for resumed work. Otherwise (`draft`, `ready`, `blocked`, missing, or malformed), summarize the plan's scope, scenarios, expected changes, and open decisions, and ask for explicit approval (capability: structured-question). A blocking decision must be resolved first. On an explicit yes, set only `status: approved` and read it back. On anything else, change nothing and stop.

4. **Completed-feature conflicts:** compare every behavior change in the plan with the scenarios of every completed feature, read from each one's specification location. If a planned change contradicts a completed scenario that the plan does not list as an amendment, do not implement that change yet: record it under `## Implementation changes from approved plan` and ask the user how to proceed (section 5). This check runs even when the plan says no other feature is affected.

## 3. Build the test mapping

1. Make the checklist from the progress table: one row per `Scenario` and outline example, each with the test or eval case named in the plan and the test kind's tool and location from the configuration. Add rows for completed features' scenarios the plan amends. Nothing may be dropped or turned into a manual check.
2. **Resume:** rows already `passing` stay as they are. Run their tests to confirm they still pass, leave their test files unchanged, and continue with the first row that is not `passing`.
3. Run the relevant focused tests before changing anything, when practical, and note pre-existing failures separately (capability: command-run).
4. Set the plan's status to `in-progress` when the first change is about to be made.

## 4. Tests first, then behavior

For each remaining row, in plan order:

1. Write or update the automated test named after the scenario, asserting the observable outcome of each `Given`/`When`/`Then`, including failure and edge behavior. Agent-behavior scenarios get eval cases run with the repository's configured eval command.
2. Run it with the configured focused command and confirm that it fails for the missing behavior (or record why a failing-first result is not meaningful). Set the row to `failing`.
3. Implement the behavior following the plan's steps and file table, using the existing architecture and patterns.
4. Run the focused test until it passes. Set the row to `passing` immediately, so an interruption leaves an accurate record.

Apply completed-feature amendments exactly as listed in the plan: tag each changed scenario `@amended-by-<slug>` with a comment above it naming this feature and the reason.

## 5. When the plan must change

If the work needs something the plan does not cover, such as a scope change, a different behavior, or a change to a completed feature that the plan does not list, record it under `## Implementation changes from approved plan` as the lifecycle describes. Explain the trade-off and ask the user before applying it (capability: structured-question). Continue with independent approved work meanwhile. A changed scenario in this feature's `.feature` file gets `@changed-from-approved` and a comment, and its test changes in the same edit. Never delete, skip, disable, or weaken a failing test to get a passing result.

## 6. Verify

1. Run the focused tests, then every command in `verification.full` and the `command` of every test kind the feature uses (capability: command-run). Run `verification.setup` first when prerequisites are missing.
2. Fix failures caused by the implementation and rerun until everything passes. Report failures that are unrelated or blocked by a missing prerequisite with their evidence, and ask the user only when genuinely blocked.
3. When commands cannot be run here, list the exact commands, ask the user to run them and paste the output, and wait. Never report an unrun check as passing, and do not set `verified` until the output shows that every required check passed.
4. Reconcile every scenario with its test and result: no unimplemented scenarios, skipped tests, unexplained changes, or unresolved planned changes. Then set `status: verified` and make sure every progress row is `passing`.

## 7. Report and archive gate

Report the implemented behavior, the scenario coverage, every required check and its result, and any recorded plan or scenario changes. Say that the feature stays in `<features.working>/<slug>/` until the user confirms archiving, and ask whether to move it to `<features.completed>/<slug>/`, with its `.feature` files going to `<features.specifications>/<slug>/` when `features.specifications` is set (capability: structured-question).

Only an explicit request to archive this feature counts as confirmation. A generic reply such as "use the recommended option", "continue", or "ok" does not; when the reply is not explicit, leave the folder in place and ask again.

- **Confirmed:** move the folder to `<features.completed>/<slug>/` with a tracked move where possible (capability: version-control). When `features.specifications` is set, move each `.feature` file of the feature to `<features.specifications>/<slug>/` instead, so it does not stay in the folder. Update references that point to the old paths, including links from the moved brief and plan to the `.feature` file, and verify that every artifact exists in its new location and none remain in the old one.
- **Not confirmed:** leave everything in place and report the implementation as verified, with archiving pending.

Commit, push, or switch branches only as the configured git rules allow.
