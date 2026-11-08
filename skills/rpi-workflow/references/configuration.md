# Repository configuration

Each repository that uses the suite declares its workflow settings in a `## Feature workflow` section of its application guidance file, `AGENTS_APP.md` at the repository root. That file holds everything specific to the repository. The shared guidance file, `AGENTS.md`, is installed together with the suite and replaced on every update, so it never holds configuration. `rpi-init` creates and updates the section; the other skills only read it.

The section contains:

1. one line saying that feature work follows the shared lifecycle in the `rpi-workflow` skill;
2. exactly one fenced `yaml` block whose top-level key is `rpi`.

The suite check parses a documented YAML subset: block maps and sequences, flow maps `{ a: b }` and sequences `[a, b]`, plain, single-quoted, and double-quoted scalars, integers, booleans, and comments. Block scalars (`|`, `>`) and anchors are not supported.

## Keys

| Key | Required | Meaning |
|---|---|---|
| `suite_version` | yes | Suite version this configuration was written for. A skill whose `metadata.version` has a different major version warns before continuing. |
| `features.working` | yes | Folder that holds features under refinement, planning, or implementation. |
| `features.completed` | yes | Folder that holds completed features: their brief and plan, and their `.feature` files unless `features.specifications` is set. |
| `features.specifications` | no | Folder that holds the living behavior specification: the `.feature` files of completed features, in one `<slug>/` folder each. When set, archiving moves a feature's `.feature` files there and the rest of its folder to `features.completed`. When omitted, the `.feature` files stay in the completed folder. |
| `architecture` | yes | Architecture document path, or `none`. |
| `verification.setup` | no | One-time prerequisite commands (installing dependencies or test browsers). |
| `verification.focused.<kind>` | yes | For each test kind, the command that runs one test file or case; `<file>` or `<case>` marks the placeholder. |
| `verification.full` | yes | Commands that must all pass before any feature is verified. |
| `test_mapping[]` | yes | One entry per test kind: `kind`, `tool`, `location` (where those tests live), and `command` (runs all tests of that kind). A feature's verification also runs the `command` of every kind its scenarios use. |
| `git.commit`, `git.push`, `git.branch` | yes | `never`, `when-asked` (only when the user explicitly asks in the session), or `allowed`. |

## Template

Values in angle brackets are placeholders. Leave out `specifications` when the scenarios should stay with the completed features.

```yaml
rpi:
  suite_version: 3.0.1
  features: { working: <working-folder>, completed: <completed-folder>, specifications: <specification-folder> }
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

## Values that must not appear in suite text

The suite check fails when a configured path, tool, or command appears in the suite's skill text. Values that are a single lowercase word are too generic to match reliably and are not checked; `none` and `<…>` placeholders are ignored.
