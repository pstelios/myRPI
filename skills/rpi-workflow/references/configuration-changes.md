# Configuration changes by release

What an application changes in its `## Feature workflow` configuration to move to each suite release, or "None." when nothing changes. `rpi-init` reads the sections after the configuration's `suite_version` when it reviews the configuration after a suite update, and the suite check asks for that review whenever the installed suite is newer than that version. The same text is the "Configuration changes" subsection of the release's changelog entry in the suite's source repository.

Sections are newest first. A section that starts with "None" needs no configuration change; the review then only records the new version.

## 3.1.0

None. No key is added, renamed, or removed. `suite_version` now records the suite version the configuration was last reviewed against: `rpi-init` sets it when the user confirms a review, and the suite check fails until the review is done whenever the installed suite is newer.

## 3.0.1

None. The suite check now reports an installed copy that is out of date; the configuration is unchanged.

## 3.0.0

Move the `## Feature workflow` section, and any other application-specific guidance, from `AGENTS.md` to `AGENTS_APP.md`. Every update replaces `AGENTS.md` with the shared guidance. Add the `rpi:update` and `rpi:check` tasks to the project's Taskfile, as in the Taskfile that a new project gets from the source repository.

## 2.0.0

New optional key `features.specifications`: a folder for the living behavior specification. Add it only when behavior specifications are kept apart from the feature documents (archiving then moves a feature's `.feature` files there); otherwise nothing changes.

## 1.0.0

None. First release.
