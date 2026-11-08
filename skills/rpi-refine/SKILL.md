---
name: rpi-refine
description: "Refine a new or existing feature into a user-confirmed, versioned refinement brief before planning. Use to clarify a feature's goals, behavior, scope, acceptance criteria, edge cases, and constraints, or to continue an unfinished brief. Part of the rpi workflow; hands off to rpi-plan."
argument-hint: "Describe the feature or name an existing feature brief"
user-invocable: true
metadata:
  suite: rpi
  version: 3.1.0
---

# Refine a Feature

Turn a feature idea into a verified, user-confirmed brief that a separate `rpi-plan` session can plan from. This skill settles requirements; it does not design or sequence the implementation.

The lifecycle, artifact names, brief frontmatter, write scopes, gates, light path, and legacy rules are defined once in `../rpi-workflow/references/lifecycle.md`. Follow it; this file only adds what is specific to refinement.

## 1. Preflight

Run the lifecycle's preflight (capability: file-read). Without the configuration, change nothing and stop with "Feature workflow configuration is missing. Run rpi-init first."

Write scope: only this feature's brief, `<features.working>/<slug>/<slug>-info.md`, and its folder when new (capability: file-write). Everything else is read-only. Work outside the scope is recorded in the brief's open questions.

## 2. Choose the feature

1. Look for unfinished work in `<features.working>/`, and for completed features, in `<features.completed>/` and any specification location, with the same or a similar slug.
2. If the request plausibly matches unfinished work, ask whether to continue it or start something new; give each plausible match as its own choice (capability: structured-question). Do not guess.
3. Continuing: read the feature's files. Treat recorded decisions as context, not as unchangeable facts, and re-verify application facts. If the brief has no frontmatter or lacks fields, follow the lifecycle's legacy rule.
4. New work: choose a distinct lowercase kebab-case slug. A completed feature is context for new work; reopening it needs the user's explicit confirmation.

## 3. Ground the feature in the application

Inspect the relevant source, tests, configuration, completed features' scenarios (from their specification locations), and the architecture document named in the configuration (capability: file-read). Keep evidence distinct: implemented facts, user decisions, and labeled assumptions or unknowns. Never ask the user for facts the repository can answer.

## 4. Choose the track

If the user asks for the light path, or the change looks like a qualifying fix, check the light-path criteria in the lifecycle against the repository evidence. If every criterion holds, use the light track. If one fails, say "This change does not qualify for the light path because <criterion>; continuing with the full track." in the same message as your first interview question, and use the full track.

## 5. Interview

Read `../rpi-grill-me/SKILL.md` and follow its protocol exactly (capability: skill-reference): the design tree, frontier order, one decision per question with the recommended choice first, low-impact defaults offered together, and stopping on request.

Explore only the consequential decisions for this feature, such as: the user problem and outcome; observable behavior and journeys; scope and non-goals; testable acceptance outcomes; edge cases, validation, failure states, accessibility, privacy, and offline behavior; data, compatibility, dependencies, and integration boundaries; rollout or migration when needed. On the light track, ask only what the fix needs. Do not propose files, architecture changes, or task order; those belong to planning.

## 6. Confirm the summary

When the frontier is empty, or the user asks to stop, summarize the feature, the settled decisions, and the open questions, and ask the user to confirm (capability: structured-question). Write nothing before confirmation. If the user corrects the summary, continue the interview and confirm again.

## 7. Write the brief

Use `../rpi-workflow/references/brief-template.md`. Set the frontmatter as the lifecycle defines:

- `status: confirmed` after a confirmed, complete interview; `status: draft` after a stop, with every unresolved decision under `## Open questions`;
- `track: light` or `full`;
- a new brief: `revision: 1` and `created_at` = `updated_at` = now (UTC);
- an existing brief: keep `created_at`, set `updated_at` to now, and increase `revision` by exactly 1. For a legacy brief without frontmatter, ask before adding it.

Never overwrite or delete another feature's artifacts, and get explicit confirmation before replacing a brief's content wholesale. After writing, read the brief back and verify the frontmatter, the confirmed requirements, and the open questions.

## 8. Hand off

Report the brief's path, status, and revision. Tell the user to start `rpi-plan` for this slug in a fresh session (capability: session-handoff). For a `draft` brief, say that planning needs its open questions resolved through `rpi-refine` first. Do not start planning.
