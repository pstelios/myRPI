# Application guidance file template

`rpi-init` writes the new project's application guidance file, `AGENTS_APP.md`, from this skeleton. The shared guidance file `AGENTS.md` comes with the suite and is never written by `rpi-init`; do not repeat its rules here. It already tells readers to read this file and the architecture document named in the configuration. Replace every placeholder. Keep the file concise: it is the canonical place for durable, user-approved rules that are specific to this project. Do not describe feature artifacts, feature folders, or plan statuses outside the `## Feature workflow` section; the shared lifecycle in `rpi-workflow` defines them.

````markdown
# <Project name>

<One-sentence description.>

## Project

<Two to four sentences: what the project is, for whom, the project type, and the key constraints (platforms, offline, privacy).>

## Day-to-day work

- Commands: <install command>, <run command>, <test command>, <check command>, <build command>.
- <Where the tests of each part of the project live, if the shared guidance does not already settle it.>

## Git rules

- Commits: <never | only when the user asks | allowed>.
- Pushes: <never | only when the user asks | allowed>.
- Branches: <never | only when the user asks | allowed>.

## Agent rules

- <Project-wide rules for agents, or "No additional rules.">

## Feature workflow

Feature work follows the shared lifecycle in the `rpi-workflow` skill (`references/lifecycle.md`). This section is its configuration.

```yaml
rpi:
  suite_version: <suite version>
  features: { working: <working folder>, completed: <completed folder>, specifications: <specification folder, or leave out> }
  architecture: <architecture document>
  verification:
    setup: [<install command>]
    focused:
      <kind>: <command that runs one test file, with <file>>
    full: [<check command>]
  test_mapping:
    - { kind: <kind>, tool: <test tool>, location: <test location>, command: <test command> }
  git: { commit: <rule>, push: <rule>, branch: <rule> }
```
````
