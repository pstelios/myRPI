---
name: rpi-init
description: "Set up the rpi feature workflow in a repository. For an existing project, inspect it and propose the 'Feature workflow' configuration section of AGENTS_APP.md, writing it only after confirmation; after a suite update, review an existing section against the configuration changes of the releases since it was last reviewed. For an empty repository, interview the user and create the application guidance file, architecture document, project shell with health-check tests, and configuration. Run before rpi-refine, rpi-plan, and rpi-implement."
argument-hint: "Optionally say 'new project' or describe what to configure"
user-invocable: true
metadata:
  suite: rpi
  version: 3.1.0
---

# Initialize the RPI Workflow

Create or update the configuration that the other rpi skills read, or bootstrap a new project. The lifecycle, configuration schema, write scopes, and capabilities are defined in `../rpi-workflow/references/lifecycle.md`, `../rpi-workflow/references/configuration.md`, and `../rpi-workflow/references/capabilities.md`; read them first (capability: skill-reference).

Nothing is written before the user explicitly confirms what will be written. If the user declines, the repository stays unchanged.

## 1. Choose the mode

Inspect the repository root (capability: file-read).

- **Empty repository** (only version-control metadata, a readme, a license, an ignore file, agent entry files, and the files the suite's source repository puts into a new project; see `../rpi-workflow/references/new-project.md`): say that the repository is empty and offer to set up a new project, with that as the recommended choice (capability: structured-question). If the user agrees, use new-project mode.
- **Existing project:** use existing-project mode. If the user asked for new-project setup, explain that the repository is not empty (name a few of the existing project files), that new-project setup only runs in an empty repository, and offer to configure the feature workflow for the existing project instead. Change nothing until the user chooses.

## 2. Existing-project mode

Write scope: only the `## Feature workflow` section of the application guidance file `AGENTS_APP.md` (capability: file-write). If `AGENTS_APP.md` does not exist, the write creates it with only a title and that section. The shared guidance file `AGENTS.md` is read-only. If it still holds a configuration block (a `yaml` block with the `rpi` key) from an older suite version, use that section's values as the starting point of the proposal, and tell the user that the section now belongs in `AGENTS_APP.md` and that the next suite update replaces `AGENTS.md`.

1. **Gather evidence** (capability: file-read): build, package, and task-runner files and their scripts or targets; test tools and where their tests live; existing documentation and any folders that hold feature specifications or scenarios; the architecture document; existing agent guidance, including any git rules it states; and the version-control state (capability: version-control). Record what each proposed value is based on.
2. **Read any existing section.** If `## Feature workflow` exists, parse it and treat it as the starting point: this is an update, never a second section. Its `suite_version` is the suite version it was last reviewed against. Read `../rpi-workflow/references/configuration-changes.md` (capability: skill-reference): the sections for versions after `suite_version`, up to this skill's `metadata.version`, are the release notes to review. Each says what to change in the configuration, or "None.". Tell the user which versions you are reviewing. If `suite_version` is newer than this skill's version, say that the installed suite is older than the configuration was reviewed for, recommend updating the suite first, and change nothing until the user decides.
3. **Propose the section** following `../rpi-workflow/references/configuration.md`. Every path, tool, and command must be one that exists in the repository or that its files define; mark anything you could not verify. Prefer folders that already hold feature specifications; otherwise recommend new folders and say they will be created by the first feature. When the repository keeps its behavior specifications apart from its feature documents (for example next to its tests), propose `features.specifications` for them; otherwise leave the key out. For an update, apply each release note that calls for a change (a new, renamed, or removed key, or a changed meaning) and base every change on the note and on repository evidence; propose nothing the notes and the evidence do not support. Keep repository-specific values out of the suite; they belong only in this section.
4. **Show it and ask** (capability: structured-question): the complete proposed section for a new configuration, or the exact differences for an update, with the evidence for each value. For an update, name the release note behind each difference, and set `suite_version` to this skill's `metadata.version`. When no other difference is needed, say that no configuration change is required and that confirming only records the review. Ask the user to confirm writing it, with confirming as the recommended choice and corrections possible as free text.
5. **On confirmation**, write or replace the section so that exactly one `## Feature workflow` section exists, with `suite_version` set to this skill's `metadata.version`, and leave the rest of the file unchanged. **On decline**, write nothing and stop.
6. **Check the result.** Read the section back. Then run the suite check, the command the shared guidance file names, from the repository root (capability: command-run). It must finish without findings: show any finding, correct it when the section causes it (a correction that differs from what the user approved needs a new confirmation), and run the check again. Findings the section does not cause are reported as unfinished work; never describe the setup as complete while the check fails. Warnings, such as an installed copy that differs from the source repository, are reported and do not block. If no such command is named or it cannot be run, tell the user how to run the suite check, if known, and that it still has to pass. Lifecycle text elsewhere in the application guidance file (artifact names, feature folders, plan statuses) is reported by that check; recommend replacing it with a pointer to `rpi-workflow`, but change it only if the user asks and only within that file.
7. **Hand off:** tell the user to start `rpi-refine` for their first feature in a fresh session (capability: session-handoff).

## 3. New-project mode

Follow `../rpi-workflow/references/new-project.md` exactly. In short:

1. Interview the user with the protocol in `../rpi-grill-me/SKILL.md` (capability: skill-reference), one decision per question with the recommended choice first, over the topics listed there. Skip topics the user already answered.
2. Present the summary under the heading "Summary" and ask for confirmation (capability: structured-question). On decline, write nothing.
3. On confirmation, write the application guidance file, the architecture document, the project shell with its task-runner entries and health-check tests, the completed `project-shell` feature, and the agent entry files the user named, all within the new-project write scope (capability: file-write).
4. Run the setup and full verification commands, then the suite check that the shared guidance file names (capability: command-run). Report the results honestly; never claim success for a failing or unrun check.
5. Hand off to `rpi-refine` for the first feature in a fresh session (capability: session-handoff).

Commit, push, or create branches only when the git rules the user chose allow it.
