---
name: rpi-plan
description: "Create or update a detailed implementation plan and Gherkin scenarios from a confirmed refinement brief, review architecture, readme, and existing-feature impact, and get the user's explicit approval. Use when planning a feature or revising its plan. Part of the rpi workflow; follows rpi-refine and hands off to rpi-implement."
argument-hint: "Name the feature or point to its refinement brief"
user-invocable: true
metadata:
  suite: rpi
  version: 3.0.0
---

# Plan a Feature

Turn a confirmed brief into Gherkin scenarios and an actionable, architecture-aligned plan that a separate `rpi-implement` session can execute. This skill does not change application code or tests.

The lifecycle, artifacts, plan frontmatter and statuses, write scopes, gates, progress table, light path, amendments to completed features, and legacy rules are defined once in `../rpi-workflow/references/lifecycle.md`. Follow it; this file only adds what is specific to planning.

## 1. Preflight

Run the lifecycle's preflight (capability: file-read). Without the configuration, change nothing and stop with "Feature workflow configuration is missing. Run rpi-init first."

Write scope: only this feature's `<slug>-plan.md` and `<slug>.feature` in `<features.working>/<slug>/` (capability: file-write). The brief, the architecture document, the project readme, other features, code, tests, and configuration are read-only. Listing a file in the plan does not authorize changing it now.

## 2. Find and validate the brief

1. Identify the feature from the request. If several working features match, ask which one (capability: structured-question).
2. If `<features.working>/<slug>/<slug>-info.md` does not exist, change nothing and stop with "Run rpi-refine for <slug> first." Do not refine it yourself and do not substitute a completed feature's brief.
3. Read the whole brief and any existing plan and scenarios.
4. A brief with `status: draft` is incomplete: do not mark any plan `ready`. Tell the user which open questions block planning and ask them to resolve them through `rpi-refine`; then stop, or, if the user insists, continue only as a `draft` or `blocked` plan.
5. A brief without frontmatter or fields is a legacy artifact: warn as the lifecycle says. Without a `revision`, record `brief_revision: 0` and say that drift detection is unavailable.
6. If an open question blocks a sound plan, ask it (one decision per question) rather than inventing behavior.

## 3. Discover implementation context

Read the guidance files, the architecture document from the configuration, and the project readme. Inspect the relevant source, tests, configuration, and feature folders to establish current behavior, the real files and boundaries involved, and which files are new or modified. Do not assume that illustrative paths in the architecture document exist.

## 4. Write the scenarios first

Create or update `<slug>.feature` from the brief's behavior and acceptance outcomes before detailing tasks. Cover successful, rejected, invalid, unavailable-dependency, failure, boundary, and recovery behavior where relevant; state the triggering context, the expected response, and resulting state clearly enough to verify without guessing; do not prescribe internals. On the light track, include a regression scenario for the restored behavior. Preserve valid existing scenarios and ask before deleting or replacing scenario content.

Assign every scenario a test kind from the configuration's `test_mapping` and name its planned test or eval case after it.

## 5. Review architecture, readme, and existing features

- Compare the design with the architecture document: module boundaries, data, offline behavior, privacy, accessibility, deployment. Ask the user to confirm the outcome (capability: structured-question): either "no architecture change", or the proposed change and its consequences, presented as a change summary (below). An approved change becomes a planned change in the file table; the document itself is not edited during planning.
- Compare the feature with the project readme (the readme file at the repository root, if there is one): what the project is and does, how to install, run, test, or configure it, and the usage, commands, options, and limitations it documents. Ask the user to confirm the outcome the same way: either "no readme change", or the proposed change as a change summary. An approved change becomes a planned change in the file table; the readme itself is not edited during planning. Without a readme, say so and do not propose one unless the brief asks for it.
- A change summary lets the user decide without opening the document. Ask about each document in its own question, after the summary. For each part of the document that would change, give: the section, what it says now (quoted briefly, or "new section"), what it would say after the change, and why the feature needs it. Then state the consequences, such as constraints that other features or later work must follow. Keep it to what changes; do not restate unaffected parts.
- Review completed and working features for overlaps, reading each completed feature's scenarios from its specification location. For each affected feature, state the current behavior, the conflict, and the recommended scenario, code, and test changes, and list completed `.feature` files to amend in the file table. Consequential conflicts are the user's decision before the plan can be `ready`. If nothing is affected, say what was checked.

## 6. Write the plan

Use `../rpi-workflow/references/plan-template.md`: every required section, the rollback and compatibility section whenever persisted data, a stored schema, a contract, or the configuration schema changes shape, and the success-metrics section (`N/A: <reason>` when there is nothing to measure). Set the frontmatter as the lifecycle defines, including `brief_revision` (the brief's current revision) and `suite_version` (this skill's `metadata.version`); keep `created_at` when updating.

The plan must:

- order steps so that scenarios come first and scenario tests come before the behavior they verify;
- take test tools, locations, and commands from the configuration, including the `agent-behavior` kind when the feature's scenarios describe agent behavior;
- describe contracts at module or service boundaries, not full code-level signatures;
- list every affected file explicitly, with `new`, `modify`, or `delete` and its purpose;
- fill the risk register and the implementation progress table (every scenario and outline example `todo`);
- keep design, scenarios, steps, verification, and the file table consistent, and keep unresolved questions visible with the steps that depend on them.

When updating an existing plan, preserve useful content and ask before removing recorded decisions.

## 7. Validate and request approval

Read the plan and scenarios back. Check the frontmatter, the slug and location, the required sections, the paths against the repository, and the consistency listed above. When nothing consequential is open, set `status: ready`, summarize the plan, its affected files, and the review outcomes, and ask the user whether they approve it (capability: structured-question). Use `blocked` instead when a required decision is outstanding, and say what is needed.

- **Approved:** set only `status: approved`, read it back, and tell the user to start `rpi-implement` for this slug in a fresh session (capability: session-handoff). Do not implement anything.
- **Changes requested:** return to `draft`, make only in-scope changes, and request approval again.

End by naming the plan's path and summarizing it.
