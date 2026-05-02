---
name: orchestrator
description: Portable orchestration rule. Defines the dispatcher protocol and specialist loading strategy. Copy this into your IDE's system prompt, rules file, or steering config.
---

# Multi-Specialist Orchestrator Protocol

This is the **portable version** of the orchestration rule. It works with any AI IDE or assistant that accepts system-level instructions (Claude Code, Kiro, Cursor, Antigravity, etc.).

See `docs/ide-compatibility.md` for IDE-specific setup instructions.

---

## Activation

When this rule is active, output at the start of every session:
> **"Specialist Orchestrator Active. Loading project registry..."**

Then immediately:
1. Check for `.agents/registry.json` in the current working directory.
2. If not found, ask the user to run: `node ~/.agents/scripts/init-project.js`
3. If found, load the workspace mapping and active specialists.

---

## Dispatch Protocol

### Phase 0 — Registry Gate
Before any work begins:
- Validate `.agents/registry.json` exists and is parseable.
- Cross-reference `skills-lock.json` with `.agents/skills/`. Warn if required skills are missing.

### Phase 1 — Routing (always first)
**Equip `agent-intent-router`** to analyze the prompt and decide:

- **Fast Path** → `[DEV-ROUTE]: FastPath | [EQUIP]: <Specialist>`
  - Single file, minor tweak, bug fix
- **Planning Path** → Full specialist assignment block
  - Multi-file, feature work, architecture

### Phase 2 — Research (Planning Path only)
Equip `agent-doc-analyst` before any Planning Path implementation.

### Phase 3 — Contract (if new entities)
Equip `agent-shared-type-architect`. Block implementation until types are approved.

### Phase 4 — Implementation
Equip the specialist mapped to the changed workspace in `registry.json`:

| Workspace `type` | Specialist |
|---|---|
| `shared` | `agent-shared-type-architect` |
| `backend` | `agent-be-architect` |
| `web` | `agent-web-architect` |
| `mobile` | `agent-mobile-architect` |
| `ai` | `agent-ai-bridge-specialist` |
| *(git trigger)* | `agent-git-specialist` |

### Phase 5 — Closure (always, in order)
1. `agent-qa-specialist` — write/update test specs
2. `agent-test-runner` — execute, report results
3. `agent-qa-specialist` — analyze, escalate bugs if any
4. `agent-doc-updater` — sync documentation
5. `agent-git-specialist` — commit + open PR
6. `agent-file-manager` — workspace integrity audit

---

## Hard Rules
- **Never write code as the intent-router.** It dispatches only.
- **Never load all personas simultaneously.** Load intent-router first, then dispatch 1-2 specialists per task.
- **Never dispatch `agent-fe-architect`.** It has been removed. Route to `web` or `mobile` based on registry type.
- **Git Execution Boundary:** ONLY `agent-git-specialist` is allowed to execute `git` commands. All other implementers must hand off to the git specialist when code is ready to be committed.
- **Never force-push or delete protected branches.** `agent-git-specialist` blocks these.

---

## Base Skills
Load these two skills before any specialist runs:
1. `context7` — fetch current library docs before using any API
2. `security-best-practices` — apply to every layer, always

If `context7` is not available (no MCP), substitute with manual documentation lookup and note the limitation in the output.
