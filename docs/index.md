# ~/.agents Documentation Index

This directory contains architecture documentation for the global multi-agent orchestration system living in `~/.agents/`.

## File Map

| File | Description | Tags |
|---|---|---|
| [personas-overview.md](./personas-overview.md) | Full reference for all **12** active personas — roles, boundaries, trigger conditions | `personas`, `orchestration`, `dispatch` |
| [orchestration-flow.md](./orchestration-flow.md) | **8 Mermaid diagrams** — full lifecycle, QA/test-runner loop, git guardrails, skill loading | `flow`, `mermaid`, `lifecycle`, `git`, `qa` |
| [project-configuration-guide.md](./project-configuration-guide.md) | How to configure a new project via `.agents/registry.json`, plus full skills matrix | `configuration`, `registry`, `setup` |
| [persona-split-rationale.md](./persona-split-rationale.md) | Decision log — why `fe-architect` was deleted and why `qa-specialist` was split | `decision`, `mobile`, `web`, `qa`, `architecture` |
| [base-skills.md](./base-skills.md) | Global base skill layer — `context7` and `security-best-practices` are required for all agents | `skills`, `base`, `context7`, `security` |

## Quick Reference — Persona Dispatch

```
intent-router (reads registry.json)
  ├── Shared types            → shared-type-architect
  ├── Backend services        → be-architect
  ├── Web UI (type=web)       → web-architect
  ├── Mobile (type=mobile)    → mobile-architect
  ├── AI / LLM / MCP          → ai-bridge-specialist
  ├── Git operations          → git-specialist
  ├── Test design & analysis  → qa-specialist    ← write specs, analyze reports
  ├── Test execution          → test-runner      ← run suites, report results
  ├── /docs                   → doc-updater
  ├── Root config / tooling   → file-manager
  └── (research, always)      → doc-analyst

fe-architect  → ❌ DELETED — use type=web or type=mobile in registry.json
```

## QA / Testing Workflow

```
qa-specialist  ──writes specs──▶  test-runner
test-runner    ──reports──▶       qa-specialist (analyze + triage)
qa-specialist  ──escalates──▶     intent-router (bugs → implementers)
               ──new specs──▶     test-runner (re-run)
```

## Scripts

| Script | Usage |
|---|---|
| `~/.agents/scripts/init-project.js` | Interactive CLI — scaffolds `.agents/` for a new project |
| `~/.agents/scripts/validate-registry.js` | Validates `registry.json`, skills-lock, and persona references |

```bash
# Bootstrap a new project
node ~/.agents/scripts/init-project.js --output /path/to/project

# Validate an existing project
node ~/.agents/scripts/validate-registry.js --root /path/to/project
```
