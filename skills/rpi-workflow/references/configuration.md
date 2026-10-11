# Repository configuration

Each repository that uses the suite declares its workflow settings in a `## Feature workflow` section of its guidance file, `AGENTS.md` at the repository root. The section lives outside the skill folders, so copying in a newer suite version never overwrites it. `rpi-init` creates and updates it; the other skills only read it.

The section contains:

1. one line saying that feature work follows the shared lifecycle in the `rpi-workflow` skill;
2. exactly one fenced `yaml` block whose top-level key is `rpi`.

The suite's scripts parse a documented YAML subset: block maps and sequences, flow maps `{ a: b }` and sequences `[a, b]`, plain, single-quoted, and double-quoted scalars, integers, booleans, and comments. Block scalars (`|`, `>`) and anchors are not supported.

## Keys

| Key | Required | Meaning |
|---|---|---|
| `suite_version` | yes | Suite version this configuration was written for. A skill whose `metadata.version` has a different major version warns before continuing. |
| `features.working` | yes | Folder that holds features under refinement, planning, or implementation. |
| `features.completed` | yes | Folder that holds completed features (the living behavior specification). |
| `architecture` | yes | Architecture document path, or `none`. |
| `verification.setup` | no | One-time prerequisite commands (installing dependencies or test browsers). |
| `verification.focused.<kind>` | yes | For each test kind, the command that runs one test file or case; `<file>` or `<case>` marks the placeholder. |
| `verification.full` | yes | Commands that must all pass before any feature is verified. |
| `test_mapping[]` | yes | One entry per test kind: `kind`, `tool`, `location` (where those tests live), and `command` (runs all tests of that kind). A feature's verification also runs the `command` of every kind its scenarios use. |
| `git.commit`, `git.push`, `git.branch` | yes | `never`, `when-asked` (only when the user explicitly asks in the session), or `allowed`. |
| `agent_evals` | only where agent evals run | Settings for the agent eval runner; see below. |

The test kind `agent-behavior` is recognized by the suite: its tests are eval cases run by the eval runner (`rpi-workflow/scripts/run-evals.mjs`).

## Template

Values in angle brackets are placeholders.

```yaml
rpi:
  suite_version: 1.0.0
  features: { working: <working-folder>, completed: <completed-folder> }
  architecture: <architecture-document-or-none>
  verification:
    setup: [<one-time-setup-command>]
    focused:
      <kind>: <command-that-runs-one-test-file-with-<file>>
    full: [<full-verification-command>]
  test_mapping:
    - { kind: <kind>, tool: <test-tool>, location: <where-these-tests-live>, command: <command-for-all-tests-of-this-kind> }
  git: { commit: when-asked, push: when-asked, branch: when-asked }
```

## Agent eval settings

Only repositories that run the suite's agent evals need `agent_evals`. Harness command lines live only here, never in the suite.

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

## Values that must not appear in suite text

The suite check (`rpi-workflow/scripts/check-suite.mjs`) fails when a configured path, tool, or command appears in the suite's skill text (its scripts and eval data are not skill text). Values that are a single lowercase word are too generic to match reliably and are not checked; `none` and `<…>` placeholders are ignored.
