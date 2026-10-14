# Verification tags (all verification is automated; there are no manual checks):
#   @static - verified by node:test tests in test/suite/ (task check).
#   @agent  - agent behavior; verified by the agent eval runner (task test:agents), which runs the
#             matching case in test/evals/cases/ non-interactively in every configured
#             harness inside a temporary fixture repository and asserts files and transcript output.
#             The case title equals the scenario name (outline examples append " - <example>").

Feature: Portable RPI workflow skill suite
  As a developer who runs the feature workflow in more than one agent harness and application
  I want the refine, plan, implement, interview, and setup skills to be a versioned, harness-neutral suite
  So that I can reuse it for new and existing projects and get the same gated, test-first workflow

  Background:
    Given the RPI skill suite is installed in the repository's canonical skill location

  Rule: The suite is portable across harnesses and applications

    @static
    Scenario: Suite folders have matching names and one shared version
      When the suite check runs
      Then the suite contains exactly the skills "rpi-workflow", "rpi-init", "rpi-refine", "rpi-plan", "rpi-implement", and "rpi-grill-me"
      And each skill's frontmatter name equals its folder name
      And each skill has a non-empty description of at most 1024 characters
      And every skill declares the same suite name and semantic version in its metadata

    @static
    Scenario: Skill text names no harness, harness tool, or slash command
      When the suite check scans every suite file except the scripts
      Then no harness name, harness tool name, harness product feature, or slash-command invocation is found

    # Changed during implementation: the scan covers the skill text (every suite file except the
    # scripts and the eval cases and fixtures), and single lowercase words such as "test" are not
    # matched. Scripts and eval fixtures legitimately contain tool names and commands of sample
    # projects, which would collide with any adopting repository's configuration.
    @static @changed-from-approved
    Scenario: Skill text contains no application-specific values
      Given the repository's "Feature workflow" configuration declares paths, tools, and commands
      When the suite check scans the skill text of every suite file except the scripts and eval data
      Then none of the configured paths, tool names, or commands appear in the suite text

    @static
    Scenario: Every capability used by a skill is defined with a fallback
      When the suite check collects every capability reference in the skills
      Then each referenced capability is defined in the shared capability vocabulary
      And each capability definition states its required behavior and its fallback

    @static
    Scenario Outline: Suite check reports a violation and fails
      Given a suite file contains <violation>
      When the suite check runs
      Then it exits with a failure
      And it reports the file, line, and rule that was violated

      Examples:
        | violation                                              |
        | a harness tool name                                    |
        | a slash-command invocation                             |
        | a configured application command                       |
        | a skill whose frontmatter name differs from its folder |
        | a skill with a different suite version                 |
        | an undefined capability reference                      |

    @static
    Scenario: Repository configuration is present and complete
      When the suite check reads the application guidance file
      Then it finds a "Feature workflow" section with every required configuration key
      And the section references the shared lifecycle definition

    @static
    Scenario: Repository configuration may name a separate specifications folder
      Given the configuration sets "features.specifications" to a folder
      When the suite check reads the application guidance file
      Then it accepts the configuration
      And it treats the folder as an application-specific value that skill text and other guidance must not contain
      And it reports an empty value as a configuration problem

    @static
    Scenario: Repository guidance does not restate the lifecycle
      When the suite check reads the application guidance file outside the "Feature workflow" section
      Then it finds no feature artifact names, feature folder paths, or plan status names

    @static
    Scenario: The repository holds one copy of the suite
      When the suite check inspects the known project skill locations
      Then the suite exists only in the canonical location
      And no pre-suite skill folders named "refine", "plan", "implement", or "grill-me" remain

    @agent
    Scenario: Suite adopted in a second application
      Given a fixture repository with a different technology stack and non-default feature folders
      And the suite folders copied into it unchanged
      When the user runs "rpi-init" and confirms the proposed configuration
      And the user runs "rpi-refine" for a small feature and confirms the summary
      Then the configuration names that repository's own test tools and commands
      And the brief is written under that repository's configured working folder

  Rule: The suite is reusable from a separate repository

    # Changed during implementation (user decision, 2026-10-11): after this feature, myRPI becomes
    # the editing source and applications pull the suite from it with a task command, so the copy
    # is an install run from the receiving side instead of an export pushed from WordIn6.
    @static @changed-from-approved
    Scenario: Installing the suite produces an identical copy
      Given a destination skills folder that already contains an older suite copy and unrelated skills
      When the suite is installed into the destination
      Then the destination's suite folders are identical to the source suite folders
      And files removed from the source suite are removed from the destination suite folders
      And files outside the destination's suite folders are unchanged

    @static
    Scenario: The installed suite holds only what applications need
      Given the suite folders in the source repository
      Then they contain no scripts (no installer, suite check, eval runner, or tests of the suite), eval cases, or fixtures
      And an installed copy contains no such files

    @static
    Scenario: Installing into an application also installs the shared guidance
      Given an application repository
      When the suite is installed into it from myRPI
      Then the application's shared guidance file is identical to myRPI's
      And a missing application guidance file is created and an existing one is unchanged

    @static
    Scenario: A new project gets only what it needs from myRPI
      Given a project name
      When the user runs "task rpi:init" in myRPI with that name
      Then a new project folder holds only the suite skills, the shared guidance file, an application guidance file, and a Taskfile
      And the Taskfile's "rpi:update" and "rpi:check" tasks run the installer and the suite check of that myRPI checkout
      And an invalid name or a non-empty folder is refused without changes

    @static
    Scenario: Installing refuses to replace application content in the shared guidance
      Given an application whose shared guidance file still holds its own content
      And that content has not moved to an application guidance file
      When the suite is installed into it
      Then the installer changes nothing
      And it tells the user to move the content to the application guidance file first

    @static @changed-from-approved
    Scenario: An installed suite passes the check without repository configuration
      Given an installed suite in a folder without repository guidance
      When the suite check runs in suite-only mode
      Then all suite rules pass
      And repository-only rules are reported as skipped

  Rule: Agent behavior is verified automatically

    @static
    Scenario: Every agent scenario has an eval case
      When the suite check compares a feature file with the eval cases
      Then every "@agent" scenario and outline example has exactly one case with the same title

    @static
    Scenario: Eval runner reports results per case and harness
      Given two configured harnesses whose commands are test stubs
      And one stub produces the expected result and one does not
      When the eval runner runs a case
      Then the report marks the case passed for the first harness and failed for the second with the failed assertion
      And the runner exits with a failure

    @static
    Scenario: Eval runner fails when no harness is configured
      Given the configuration declares no agent eval harness
      When the eval runner starts
      Then it exits with a failure explaining that a harness must be configured

    @static
    Scenario: Eval runner isolates fixtures outside the repository
      When the eval runner prepares a case
      Then the fixture repository is created in a temporary location outside the project
      And the project's own files are unchanged after the run

  Rule: Setup is explicit and confirmation-gated

    @agent
    Scenario Outline: A workflow skill stops when configuration is missing
      Given the repository guidance has no "Feature workflow" section
      When the user starts "<skill>"
      Then the skill makes no file changes
      And it tells the user to run "rpi-init" first

      Examples:
        | skill         |
        | rpi-refine    |
        | rpi-plan      |
        | rpi-implement |

    @agent
    Scenario: rpi-init proposes configuration from repository evidence
      Given an existing project whose guidance has no "Feature workflow" section
      When the user starts "rpi-init"
      Then it proposes a section whose paths, tools, and commands match files that exist in the repository
      And it asks for explicit confirmation before writing

    @agent
    Scenario: rpi-init writes nothing without confirmation
      Given "rpi-init" has proposed a configuration section
      When the user declines
      Then the application guidance file is unchanged

    @agent
    Scenario: rpi-init updates an existing configuration instead of duplicating it
      Given the repository guidance already has a "Feature workflow" section
      When the user starts "rpi-init" and confirms the proposed differences
      Then exactly one "Feature workflow" section exists

  Rule: rpi-init bootstraps a new project through an interview

    @agent
    Scenario: rpi-init offers new-project setup in an empty repository
      Given a repository that contains no project files besides an optional readme and license
      When the user starts "rpi-init"
      Then it offers to set up a new project
      And it starts the new-project interview using the shared interview protocol

    @agent
    Scenario: New-project interview settles the project foundation
      Given the user chose new-project setup
      When the interview runs
      Then it settles the project name, description, project type, technology stack, test tools, task runner, and git rules
      And it asks one decision per question with the recommended choice first

    @agent
    Scenario: A confirmed new project gets guidance, architecture, and configuration
      Given the user confirmed the new-project summary
      When "rpi-init" writes the project
      Then the repository has an application guidance file with the project's name, description, and rules
      And it has an architecture document with the chosen stack and structure
      And the application guidance file has a "Feature workflow" section that passes the suite check

    @agent
    Scenario: A new project gets an empty shell with passing health checks
      Given the user confirmed the new-project summary
      When "rpi-init" writes the project
      Then the project shell builds with the chosen stack
      And it contains health-check tests for the shell
      And a completed "project-shell" feature records the health-check scenarios linked to those tests
      And the configured full verification passes in the new project

    @agent
    Scenario: Agent entry files point to the guidance file
      Given the user named agent entry files during the interview
      When "rpi-init" writes the project
      Then each named entry file exists and points to the shared guidance file without repeating it

    @agent
    Scenario: New-project setup writes nothing without confirmation
      Given the new-project interview has finished
      When the user declines the summary
      Then the repository is unchanged

    @agent
    Scenario: New-project setup refuses a repository with existing project files
      Given a repository that already contains project source files
      When the user asks "rpi-init" for new-project setup
      Then it explains that the repository is not empty
      And it offers configuration for the existing project instead

  Rule: Environment capabilities degrade to defined fallbacks

    @agent
    Scenario: Structured questions fall back to plain text
      Given the environment offers no structured-question capability
      When a skill needs a user decision
      Then it asks one question in plain text with labeled choices, the recommended choice first, and an explicit free-text option
      And it ends its turn without changing files

    @agent
    Scenario: Command execution falls back to the user
      Given the environment cannot run project commands
      When "rpi-implement" reaches verification
      Then it asks the user to run the configured verification commands and report the output
      And it does not report any unrun check as passing

  Rule: Refinement produces a versioned brief

    @agent
    Scenario: Confirmed refinement writes a confirmed brief
      Given the user confirms the refinement summary
      When "rpi-refine" writes the brief
      Then the brief frontmatter has status "confirmed", a creation timestamp, and revision 1

    @agent
    Scenario: Early stop writes a draft brief
      When the user asks to stop the interview before every decision is settled
      Then the written brief has status "draft"
      And every unresolved decision is listed under open questions

    @agent
    Scenario: Re-confirming a changed brief increments its revision
      Given a confirmed brief with revision 2
      When the user refines it further and confirms the changes
      Then the brief has revision 3 and its original creation timestamp

    @agent
    Scenario: Interview asks one decision per question
      When "rpi-refine" interviews the user
      Then each question asks for exactly one decision

    @agent
    Scenario: Interview offers to accept low-impact defaults together
      Given the remaining unresolved decisions are all low-impact
      When "rpi-grill-me" reaches them
      Then it lists them with their recommended answers and asks once whether to accept them all

  Rule: Planning starts from a confirmed brief and records traceability

    @agent
    Scenario: Planning stops when the brief is missing
      Given no brief exists for the requested feature
      When the user starts "rpi-plan"
      Then it writes no files
      And it tells the user to run "rpi-refine" for that feature

    @agent
    Scenario: Planning treats a draft brief as incomplete
      Given the feature brief has status "draft"
      When the user starts "rpi-plan"
      Then it does not mark any plan "ready"
      And it asks the user to resolve the brief's open questions through "rpi-refine"

    @agent
    Scenario: A written plan records traceability and required sections
      Given a confirmed brief with revision 3
      When "rpi-plan" writes the plan
      Then the plan frontmatter records brief revision 3 and the suite version
      And the plan contains every required section, including the risk register and the implementation progress checklist

    @agent
    Scenario: A persisted-data change requires a rollback note
      Given the brief requires changing the shape of persisted data
      When "rpi-plan" writes the plan
      Then the plan contains a rollback and compatibility section

    @agent
    Scenario: Success metrics may be not applicable
      Given the application has no telemetry
      When "rpi-plan" writes the plan
      Then the success-metrics section states "N/A" with a reason

    @agent
    Scenario: Planning summarizes architecture and readme changes before asking
      Given the brief needs behavior that the architecture document rules out and the readme does not describe
      When "rpi-plan" reviews the architecture document and the readme
      Then before asking the user about each document, it summarizes per affected section what the document says now, what it would say, and why
      And the plan records each approved change in its review section and its file table
      And neither document is changed during planning

    @agent
    Scenario: Planning hands off without starting implementation
      When the user approves the plan
      Then the plan status becomes "approved"
      And the skill tells the user to start "rpi-implement" in a fresh session
      And it makes no application changes

  Rule: Implementation is gated, traceable, and resumable

    @agent
    Scenario: Implementation refuses an unapproved plan
      Given the plan status is "ready"
      When the user starts "rpi-implement" and declines to approve
      Then no application code or tests are changed

    @agent
    Scenario: Implementation reports a brief changed after planning
      Given the brief revision is newer than the revision recorded in the plan
      When the user starts "rpi-implement"
      Then it reports the drift before changing anything

    @agent
    Scenario: Implementation tracks status through completion
      Given an approved plan for a one-scenario feature
      When "rpi-implement" completes the work
      Then the plan status is "verified"
      And the progress checklist marks the scenario passing

    @agent
    Scenario: Implementation resumes from the progress checklist
      Given an in-progress plan whose checklist marks the first of two scenarios as passing
      When a new session starts "rpi-implement"
      Then it implements the second scenario
      And the first scenario's test file is unchanged

    @agent
    Scenario: Implementation respects its write scope
      When "rpi-implement" completes an approved plan
      Then the feature brief is unchanged

    @agent
    Scenario: Implementation follows configured git rules
      Given the configuration allows commits only when the user asks
      When "rpi-implement" completes an approved plan
      Then no new commit exists and the branch is unchanged

    @agent
    Scenario: An approved plan amends a completed feature's scenarios
      Given the approved plan lists a change to a completed feature's scenario
      When "rpi-implement" applies it
      Then the changed scenario carries a tag and comment naming this feature and the reason

    @agent
    Scenario: An unplanned change to a completed feature needs a decision
      Given implementation requires a change to a completed feature that the plan does not list
      When "rpi-implement" detects it
      Then it records the change under the plan's implementation changes
      And it asks the user before applying it

    @agent
    Scenario: Archiving requires confirmation
      Given the plan status is "verified"
      When the user has not confirmed archiving
      Then the feature folder stays in the working location

    @agent
    Scenario: Archiving moves the scenarios to the specifications folder
      Given the plan status is "verified"
      And the configuration names a specifications folder
      When the user confirms archiving
      Then the feature folder moves to the completed location without its ".feature" files
      And the ".feature" files move to the specifications folder

  Rule: Small changes may use a light path without skipping gates

    @agent
    Scenario: A qualifying fix uses the light path
      Given a bug fix that restores specified behavior without changing contracts or persisted data
      When the user refines it and confirms the summary
      Then the brief is marked as the light track
      And the resulting plan still requires approval, a regression scenario with a test, and full verification

    @agent
    Scenario: A behavior-changing change is refused the light path
      Given a change that alters observable behavior, a contract, or persisted data
      When the user asks for the light path
      Then the skill explains which criterion fails and continues with the full track

  Rule: Artifacts created before the suite remain usable

    @agent
    Scenario: Legacy artifacts are accepted with a warning
      Given a brief without frontmatter and a plan without a brief revision or progress checklist
      When the user starts "rpi-implement" for that feature
      Then the skill warns which fields are missing
      And it does not rewrite the artifacts without the user's permission
