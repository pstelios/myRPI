# New-project setup

`rpi-init` uses this file in new-project mode. It turns an empty repository into a project with an application guidance file, an architecture document, an empty but runnable shell, health-check tests, a feature workflow configuration, and a completed `project-shell` feature.

## When a repository counts as empty

The repository may contain only version-control metadata (for example a `.git` folder), a readme, a license, an ignore file, agent entry files, and what the suite's source repository puts into a new project: the shared guidance file `AGENTS.md`, the installed suite, an application guidance file `AGENTS_APP.md` without a `## Feature workflow` section, and a task-runner file whose only tasks update and check the suite. Anything else (source, build or package files, tests, documentation folders) means it is an existing project: explain that it is not empty and offer existing-project configuration instead. Never set up a new project over existing files.

## Interview topics

Run the interview with the protocol in `../rpi-grill-me/SKILL.md` (capability: skill-reference): one decision per question, recommended choice first, and facts found by inspection rather than asked. Each message asks about one topic only; never put two of the topics below into one message. Skip any topic the user already answered. Settle, in dependency order:

1. Project name and a one-sentence description.
2. Audience and target platforms.
3. Project type: web application, service or API, command-line tool, library, mobile application, or other.
4. Language and framework (the technology stack), with the version policy.
5. Test tools: unit or component tests, and end-to-end tests if the type needs them.
6. Task runner and package manager: the single entry point for install, run, test, check, and build.
7. Data and storage: none, local files, a local database, or a remote service.
8. Offline, privacy, and security constraints.
9. Deployment target (optional; "not decided" is acceptable).
10. Repository layout: the working and completed feature folders, optionally a separate folder for the behavior specification (the `.feature` files of completed features), and the architecture document path.
11. Git rules for the workflow: commit, push, and branch (`never`, `when-asked`, or `allowed`).
12. Agent rules: any project-wide rules for agents beyond the defaults.
13. Agent entry files: which files agent environments read first, if any, to create as pointers to the shared guidance file.

Recommend choices that keep the shell minimal and runnable offline, and that use the stack's standard tools. When the summary is ready, present it under the heading "Summary" with one line per settled topic, then ask the user to confirm it (capability: structured-question). Do not write anything before the user confirms.

## What to write after confirmation

1. **Application guidance file** `AGENTS_APP.md` (replacing a placeholder file, if any), from [guidance-template.md](guidance-template.md): the project name, description, rules, day-to-day commands, git rules, agent rules, and the `## Feature workflow` section built from the interview (see [configuration.md](configuration.md)).
2. **Architecture document** at the chosen path, from [architecture-template.md](architecture-template.md): goals, stack, structure, data, quality attributes, and open decisions.
3. **Project shell:** use the stack's official project generator when one exists and can run (capability: command-run). Otherwise, write the minimal files the stack needs to build and run: a package or build manifest, one entry point, and the source and test folders. The shell does nothing beyond the health checks; do not add features.
4. **Task-runner entries** for install, run, test, check (all checks), and build, as the stack supports them. The configuration's commands must use these entries. When a task-runner file already exists, add the entries to it and keep its existing tasks unchanged.
5. **Health-check tests** for the project type:

   | Type | Health checks |
   |---|---|
   | Web application | The page loads and shows the application name |
   | Service or API | The health endpoint returns success |
   | Command-line tool | The version and help options succeed and print the name |
   | Library | The public entry point can be imported and exposes its version or name |
   | Mobile or other | The application starts, or the closest available equivalent |

6. **Completed feature** `<features.completed>/project-shell/`: a brief (`status: confirmed`, `revision: 1`) describing the shell, a plan (`status: verified`) whose progress table marks every health check `passing`, and `project-shell.feature`, whose scenarios are the health checks, each naming its test. The `.feature` file goes to `<features.specifications>/<slug>/` when a specifications folder was chosen, and stays with the brief and plan otherwise.
7. **Agent entry files**, only those the user named: each is a short pointer (at most a few lines) that tells the reader to follow the shared guidance file `AGENTS.md`, without repeating its content. Do not name `AGENTS_APP.md` there: `AGENTS.md` is the single starting point and tells the reader to read it.

Then run the setup commands and the configured full verification (capability: command-run). Report the output. If anything fails, fix the shell within this write scope and run again; if it still fails, report the failure and do not claim the setup succeeded.

Finish by telling the user that the next step is `rpi-refine` for the first feature, in a fresh session (capability: session-handoff).
