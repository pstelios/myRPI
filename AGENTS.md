# Project guidance

myRPI is the editing source of the rpi workflow skill suite in `skills/`. Applications install it from here with `skills/rpi-workflow/scripts/install-suite.mjs`, run from the application side.

## Day-to-day work

- Use [Taskfile.yml](Taskfile.yml): `task check` runs the suite's static tests and checks (offline, fast); `task test:agents` runs the agent eval cases in every configured harness (slow, paid model usage, needs the harness CLIs logged in). Pass runner options after `--`, for example `task test:agents -- --case A09 --harness copilot-cli`.
- The suite's Gherkin behavior specification lives in `docs/` (the file `task check` names). Every `@agent` scenario has exactly one eval case in `skills/rpi-workflow/evals/cases/`; `task check` enforces it.
- Keep the suite harness-neutral and free of application-specific values; `task check` enforces both.
- For every release, bump `metadata.version` in all six skills, update [CHANGELOG.md](CHANGELOG.md), and run `task test:agents` in both harnesses. Results go to [docs/agent-eval-results.md](docs/agent-eval-results.md); the runner merges new results into it.
- Do not commit secrets, credentials, or private data.

## Feature workflow

Feature work follows the shared lifecycle in the `rpi-workflow` skill (`skills/rpi-workflow/references/lifecycle.md`). This section is its configuration; it is also what the agent eval runner reads.

```yaml
rpi:
  suite_version: 1.0.0
  features: { working: docs/features-working, completed: docs/features }
  architecture: none
  verification:
    focused:
      static-workflow: task check
      agent-behavior: task test:agents -- --case <case>
    full: [task check]
  test_mapping:
    - { kind: static-workflow, tool: node test runner, location: skills/rpi-workflow/scripts/test, command: task check }
    - { kind: agent-behavior, tool: rpi eval runner, location: skills/rpi-workflow/evals/cases, command: task test:agents }
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
