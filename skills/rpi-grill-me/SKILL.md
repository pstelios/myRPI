---
name: rpi-grill-me
description: "Interview the user relentlessly about a plan, decision, or idea until every consequential branch is settled. Use to stress-test thinking or when the user uses any 'grill' phrase. Also the shared interview protocol that rpi-refine and rpi-init follow."
argument-hint: "Describe the plan, decision, or idea to stress-test"
user-invocable: true
metadata:
  suite: rpi
  version: 3.1.0
---

# Grill Me

Interview the user until you reach a shared understanding. This skill writes no files; any skill that uses it as its interview protocol keeps its own write scope.

## Design tree

Map the topic as a **design tree**: every decision branches into the decisions that depend on it. At each step, look at the **frontier**, the decisions whose prerequisites are settled. Ask the most important one first: decisions that many others depend on, or that would change the direction substantially, come before dependent or lower-impact ones.

Finding **facts** is your job, never the user's. When a question depends on a fact about the project or environment, look it up (capability: file-read) and treat facts still being verified as unsettled prerequisites. **Decisions** are the user's.

## Asking

- Ask exactly **one decision per question**, then end the turn and wait for the answer (capability: structured-question). Never bundle decisions, and never ask a second question in the same message, even when the next decisions look small. Before sending, check that the message contains exactly one question; if it contains more, keep only the most important one. Ask it once: do not restate or rephrase it, and do not move on to the next decision, until the user has answered. Several small decisions together belong in the low-impact defaults list below, not in separate questions in one message.
- Offer concise, distinct choices. Put the recommended choice first, marked `(Recommended)`, with a short rationale when it helps. Say briefly why the decision matters when that is not obvious.
- Phrase a naturally yes/no decision so that "yes" accepts the recommendation.
- After each answer, update the tree and recompute the frontier before asking again.
- If the user already stated a decision, treat it as settled; do not ask it again.

## Low-impact defaults

When every remaining decision on the frontier is low-impact (it changes no observable behavior, contract, data shape, or scope, and is easy to revise later), do not ask them one by one. List each one with its recommended answer, then ask once: "Accept all recommended defaults?" If the user accepts, record them all as decisions. If the user rejects some, ask about those one at a time.

## Stopping

The user may stop at any time (for example by writing "stop" or "that's enough" as an answer). Then stop asking, keep every decision settled so far, and list every unresolved branch of the tree as an open question. Do not present a stopped interview as complete.

## Finishing

The interview is complete when the frontier is empty: every branch visited and nothing silently assumed. Summarize the shared understanding, settled decisions, and open questions, and ask the user to confirm the summary. Do not act on it until the user confirms.
