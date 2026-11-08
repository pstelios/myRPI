# Project guidance

Greeter is a tiny dependency-free Node.js library. Read `docs/design.md` before changing it.

- Run `npm test` for unit tests and `npm run check` for lint plus tests.
- Keep functions pure and covered by unit tests in `test/`.

## Feature workflow

Feature work follows the shared lifecycle in the `rpi-workflow` skill (`references/lifecycle.md`). This section is its configuration.

```yaml
rpi:
  suite_version: 3.0.0
  features: { working: work/features, completed: work/done, specifications: work/specs }
  architecture: docs/design.md
  verification:
    focused:
      unit: node --test <file>
    full: [npm run check]
  test_mapping:
    - { kind: unit, tool: node:test, location: test, command: npm test }
  git: { commit: when-asked, push: when-asked, branch: when-asked }
```
