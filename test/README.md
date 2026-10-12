# Tests of the suite

Everything here is myRPI's own verification. None of it is installed into applications: only `skills/` is.

| Folder | What it holds |
| --- | --- |
| `suite/` | `node:test` tests of the suite scripts (the suite check, the installer, the libraries) and of the eval runner. They verify the `@static` scenarios of `docs/rpi-suite.feature`. |
| `evals/cases/` | Agent eval cases, one per `@agent` scenario. The case title equals the scenario name. |
| `evals/fixtures/` | Fixture repositories that cases seed from. They are fake projects, never real ones. |
| `evals/run-evals.mjs` | The agent eval runner. |
| `evals/check-coverage.mjs` | Checks that every `@agent` scenario has exactly one case, and every case has a scenario. |
| `evals/lib/` | Small helpers used only by the eval tools (a Gherkin reader and a command runner). |
| `evals/agent-evals.yaml` | Example `agent_evals` settings. |

## Running

- `task check`: the suite tests, the suite check of this repository's configuration, and the eval coverage check (offline and fast).
- `task test:agents`: runs the agent eval cases in every configured harness. It is slow, uses paid model usage, and needs the harness CLIs logged in. Options go after `--`, for example `task test:agents -- --case A09 --harness copilot-cli`.

The runner takes `--cases <dir>`, `--fixtures <dir>`, and `--suite <skills-dir>` to point at other locations; the tests use them with temporary data.

## Agent eval settings

Only repositories that run agent evals need `agent_evals` in their "Feature workflow" configuration. Harness command lines live only there, never in the suite.

| Key | Meaning |
|---|---|
| `report` | Repository path of the generated results report. |
| `skills_dir` | Skill location to copy the suite into inside each fixture repository. |
| `ignore[]` | Paths the runner ignores when it checks a fixture for changes (files an environment writes on its own). |
| `harnesses[].name` | Short name used in the report and with `--harness`. |
| `harnesses[].start` | Command template that starts a non-interactive session with one prompt. Placeholders: `{prompt}`, and optionally `{session}` (the runner then assigns a new session id). |
| `harnesses[].resume` | Command template that sends the next prompt to the same session (`{prompt}`, `{session}`). |
| `harnesses[].session` | Optional regular expression whose first group extracts the session id from `start` output, when the runner cannot assign one. |
| `harnesses[].disable.<capability>` | Extra arguments that switch off a capability. Every case disables `structured-question`, so each harness must define it. |
| `harnesses[].env_unset[]` | Environment variable names (with `*` wildcards) removed before starting the harness. |
| `harnesses[].version` | Optional command whose first output line is recorded in the report. |
| `harnesses[].timeout_s` | Per-turn timeout in seconds (default 900). |

The runner creates every fixture in the operating system's temporary folder and refuses to run when that folder is inside the project. The harness permission arguments therefore apply only to disposable fixtures.
