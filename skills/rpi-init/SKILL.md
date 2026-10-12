---
name: rpi-init
description: "Set up the rpi feature workflow in a repository. For an existing project, inspect it and propose the 'Feature workflow' configuration section of AGENTS.md, writing it only after confirmation. For an empty repository, interview the user and create the guidance file, architecture document, project shell with health-check tests, and configuration. Run before rpi-refine, rpi-plan, and rpi-implement."
argument-hint: "Optionally say 'new project' or describe what to configure"
user-invocable: true
metadata:
  suite: rpi
  version: 1.1.0
---

# Initialize the RPI Workflow

Create or update the configuration that the other rpi skills read, or bootstrap a new project. The lifecycle, configuration schema, write scopes, and capabilities are defined in `../rpi-workflow/references/lifecycle.md`, `../rpi-workflow/references/configuration.md`, and `../rpi-workflow/references/capabilities.md`; read them first (capability: skill-reference).

Nothing is written before the user explicitly confirms what will be written. If the user declines, the repository stays unchanged.

## 1. Choose the mode

Inspect the repository root (capability: file-read).

- **Empty repository** (only version-control metadata, a readme, a license, an ignore file, or agent entry files; see `../rpi-workflow/references/new-project.md`): say that the repository is empty and offer to set up a new project, with that as the recommended choice (capability: structured-question). If the user agrees, use new-project mode.
- **Existing project:** use existing-project mode. If the user asked for new-project setup, explain that the repository is not empty (name a few of the existing project files), that new-project setup only runs in an empty repository, and offer to configure the feature workflow for the existing project instead. Change nothing until the user chooses.

## 2. Existing-project mode

Write scope: only the `## Feature workflow` section of `AGENTS.md` (capability: file-write). If `AGENTS.md` does not exist, the write creates it with only a title and that section.

1. **Gather evidence** (capability: file-read): build, package, and task-runner files and their scripts or targets; test tools and where their tests live; existing documentation and any folders that hold feature specifications or scenarios; the architecture document; existing agent guidance, including any git rules it states; and the version-control state (capability: version-control). Record what each proposed value is based on.
2. **Read any existing section.** If `## Feature workflow` exists, parse it and treat it as the starting point: this is an update, never a second section.
3. **Propose the section** following `../rpi-workflow/references/configuration.md`. Every path, tool, and command must be one that exists in the repository or that its files define; mark anything you could not verify. Prefer folders that already hold feature specifications; otherwise recommend new folders and say they will be created by the first feature. When the repository keeps its behavior specifications apart from its feature documents (for example next to its tests), propose `features.specifications` for them; otherwise leave the key out. Keep repository-specific values out of the suite; they belong only in this section.
4. **Show it and ask** (capability: structured-question): the complete proposed section for a new configuration, or the exact differences for an update, with the evidence for each value. Ask the user to confirm writing it, with confirming as the recommended choice and corrections possible as free text.
5. **On confirmation**, write or replace the section so that exactly one `## Feature workflow` section exists, and leave the rest of the file unchanged. **On decline**, write nothing and stop.
6. **Check the result.** Read the section back. If Node.js is available, run the suite check from the repository root (capability: command-run): `node` with the path of this suite's `rpi-workflow/scripts/check-suite.mjs`, then `--repo .`. Report its findings. Lifecycle text elsewhere in the guidance file (artifact names, feature folders, plan statuses) is reported by that check; recommend replacing it with a pointer to `rpi-workflow`, but change it only if the user asks and only within the guidance file.
7. **Hand off:** tell the user to start `rpi-refine` for their first feature in a fresh session (capability: session-handoff).

## 3. New-project mode

Follow `../rpi-workflow/references/new-project.md` exactly. In short:

1. Interview the user with the protocol in `../rpi-grill-me/SKILL.md` (capability: skill-reference), one decision per question with the recommended choice first, over the topics listed there. Skip topics the user already answered.
2. Present the summary under the heading "Summary" and ask for confirmation (capability: structured-question). On decline, write nothing.
3. On confirmation, write the guidance file, the architecture document, the project shell with its task-runner entries and health-check tests, the completed `project-shell` feature, and the agent entry files the user named, all within the new-project write scope (capability: file-write).
4. Run the setup and full verification commands (capability: command-run). Report the results honestly; never claim success for a failing or unrun check.
5. Hand off to `rpi-refine` for the first feature in a fresh session (capability: session-handoff).

Commit, push, or create branches only when the git rules the user chose allow it.
