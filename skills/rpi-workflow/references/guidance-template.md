# Guidance file template

`rpi-init` writes the new project's guidance file, `AGENTS.md`, from this skeleton. Replace every placeholder. Keep the file concise: it is the canonical place for durable, user-approved project rules. Do not describe feature artifacts, feature folders, or plan statuses outside the `## Feature workflow` section; the shared lifecycle in `rpi-workflow` defines them.

````markdown
# <Project name>

<One-sentence description.>

## Read first

Before planning or changing the project, read [<architecture document>](<architecture document>). It is the source of truth for architecture and technology choices.

## Project

<Two to four sentences: what the project is, for whom, the project type, and the key constraints (platforms, offline, privacy).>

## Day-to-day work

- Use <task runner> as the entry point: <install command>, <run command>, <test command>, <check command>, <build command>.
- Run the relevant tests and checks for every change. Report a missing command explicitly instead of claiming it ran.
- Keep tests close to the behavior they verify.
- Do not commit secrets, credentials, or private user data.

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
  features: { working: <working folder>, completed: <completed folder> }
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
