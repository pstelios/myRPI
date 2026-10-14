# Application guidance

Guidance specific to the myRPI repository. The shared way of working is in [AGENTS.md](AGENTS.md).

## Project

myRPI is the editing source of the rpi workflow skill suite in `skills/` and of the shared guidance file `AGENTS.md`. Applications receive the skills, `AGENTS.md`, an `AGENTS_APP.md` placeholder, and (new projects) a Taskfile from `templates/`: `skills/` holds nothing but skills and their reference documents, and `AGENTS.md` holds nothing application-specific. The installer, the suite check, and their libraries live in `scripts/`; the suite's own tests, eval cases, fixtures, and eval runner live in `test/`. None of them is copied.

- `task rpi:init` ([scripts/init-project.mjs](scripts/init-project.mjs)) asks for a project name and creates the project next to this checkout with only those files. Its Taskfile's `rpi:update` and `rpi:check` run [scripts/install-suite.mjs](scripts/install-suite.mjs) and [scripts/check-suite.mjs](scripts/check-suite.mjs) from this checkout.
- Existing applications update with their `task rpi:update`, so the installer that runs is always the one in this checkout. It mirrors the `rpi-*` skill folders, replaces the application's `AGENTS.md` with this repository's copy, and creates the application's `AGENTS_APP.md` when it is missing.
- In this repository, `AGENTS.md` is edited directly: it is the source that applications pull. Keep it free of anything that only myRPI or only one application needs; that belongs in an `AGENTS_APP.md`. `task check` is this repository's suite check; it has no `rpi:update` or `rpi:check`.

## Day-to-day work

- `task check` runs the suite's static tests and checks (offline, fast); `task test:agents` runs the agent eval cases in every configured harness (slow, paid model usage, needs the harness CLIs logged in). Pass runner options after `--`, for example `task test:agents -- --case A09 --harness copilot-cli`.
- The suite's Gherkin behavior specification lives in `docs/` (the file `task check` names). Every `@agent` scenario has exactly one eval case in `test/evals/cases/`; `task check` enforces it.
- Keep the suite harness-neutral and free of application-specific values; `task check` enforces both.
- For every release, bump `metadata.version` in all six skills, update [CHANGELOG.md](CHANGELOG.md), and run `task test:agents` in both harnesses. Results go to [docs/agent-eval-results.md](docs/agent-eval-results.md); the runner merges new results into it.

## Feature workflow

Feature work follows the shared lifecycle in the `rpi-workflow` skill (`skills/rpi-workflow/references/lifecycle.md`). This section is its configuration; it is also what the agent eval runner reads.

```yaml
rpi:
  suite_version: 3.0.0
  features: { working: docs/features-working, completed: docs/features }
  architecture: none
  verification:
    focused:
      static-workflow: task check
      agent-behavior: task test:agents -- --case <case>
    full: [task check]
  test_mapping:
    - { kind: static-workflow, tool: node test runner, location: test/suite, command: task check }
    - { kind: agent-behavior, tool: rpi eval runner, location: test/evals/cases, command: task test:agents }
  git: { commit: when-asked, push: when-asked, branch: when-asked }
  agent_evals:
    report: docs/agent-eval-results.md
    skills_dir: .claude/skills
    harnesses:
      - name: claude-code
        start: claude -p {prompt} --session-id {session} --permission-mode bypassPermissions
        resume: claude -p {prompt} --resume {session} --permission-mode bypassPermissions
        version: claude --version
        disable: { structured-question: --disallowedTools AskUserQuestion, command-run: '--disallowedTools Bash,PowerShell,Monitor' }
        env_unset: ['CLAUDE*']
        timeout_s: 1200
      - name: copilot-cli
        start: copilot -p {prompt} --session-id {session} --allow-all-tools -s --no-auto-update
        resume: copilot -p {prompt} --resume {session} --allow-all-tools -s --no-auto-update
        version: copilot --version
        disable: { structured-question: --no-ask-user, command-run: --deny-tool shell }
        timeout_s: 1200
```
