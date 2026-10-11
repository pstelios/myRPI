# Capability vocabulary

The rpi skills never name a specific agent environment or its tools. Every interaction with the environment is one of the capabilities below, referenced in skill text as `(capability: <name>)`. Map each capability to whatever your environment offers. When the environment does not offer it, or a call fails, use its fallback. Never skip the step silently, and never report a step that did not happen as done.

### structured-question

Required behavior: Ask the user exactly one focused question about one decision, with concise, distinct choices. Put the recommended choice first and mark it `(Recommended)`. Always allow a free-text answer. Then end the turn and wait for the reply before doing anything that depends on it.

Fallback: Write the question as plain text: the question on its own line, then the choices as a labeled list (`A.`, `B.`, …) with the recommended choice first and marked `(Recommended)`, then a final line offering a free-text answer ("Or answer in your own words."). End the turn without changing any file and wait for the reply.

The skills' questions apply even when the environment asks you to work autonomously or without asking questions: ask the one question in plain text, end the turn, and continue only after a reply. Never answer your own question, and never ask a second question in the same turn.

### file-read

Required behavior: Read and search the project's files, including other skills' files in the suite.

Fallback: None; this capability is required. Without it, stop and tell the user that the skill cannot run here.

### file-write

Required behavior: Create, edit, move, and delete files, but only those inside the current skill's write scope (see [lifecycle.md](lifecycle.md#write-scopes)).

Fallback: Present the exact file content or change for the user to apply, name the target paths, and stop until the user confirms that it was applied.

### command-run

Required behavior: Run the commands named in the repository configuration (and the version-control commands the skill needs), and read their exit status and output.

Fallback: Ask the user to run the exact commands and paste the output, then wait. Never report a check that was not run as passing, and do not move a plan to a status that requires passing checks.

### version-control

Required behavior: Inspect the working-tree state and recent history, and perform tracked moves, following the repository's configured git rules.

Fallback: Tell the user exactly what to inspect or move (for example, which folder to move where) and ask them to report the result before continuing.

### skill-reference

Required behavior: Read another suite skill's instruction or reference file by its relative path (for example `../rpi-grill-me/SKILL.md`) and follow it. This does not require skills to be able to invoke each other.

Fallback: None needed; this is a file read. If the file is missing, stop and report that the suite is incomplete.

### session-handoff

Required behavior: When a phase ends, tell the user which rpi skill to start next, with which input, in a fresh session. Never continue into the next phase in the same session.

Fallback: None needed.
