# 🤖 Multi-Specialist Agent Orchestration System

A project-agnostic boilerplate for running a team of specialized AI agents in any codebase. It forces agents to act as **specialists** rather than generic assistants, preventing hallucination, enforcing project boundaries, and ensuring high-quality output through a defined QA feedback loop.

## 🌟 Why this exists
LLMs fail when given a massive codebase and told to "fix the bug." They hallucinate APIs, break unrelated files, and ignore architecture rules. This system solves that by:
1. **Routing intent**: A Tech Lead (`intent-router`) analyzes your prompt and assigns a specialist.
2. **Enforcing boundaries**: The `web-architect` can't touch the backend. The `test-runner` can't write code.
3. **Mandating context**: Agents must read project rules (`registry.json`) and fetch live documentation (`context7`) *before* writing code.

## 🚀 Quick Start

### 1. Initialize a project
Run the interactive CLI inside your project to generate its `.agents/` config folder:
```bash
node ~/.agents/scripts/init-project.js --output /path/to/your/project
```

### 2. Validate configuration
Ensure the generated registry maps correctly to the global personas:
```bash
node ~/.agents/scripts/validate-registry.js --root /path/to/your/project
```

### 3. Setup your IDE
Copy the `orchestrator.md` protocol into your IDE's system instructions (see `templates/ide/README.md` for specific IDE instructions).

### 4. Install Base Skills
The system requires `context7` and `security-best-practices` to operate safely. You must install these skills (e.g., from [agentskills.io](https://agentskills.io) or your own library) into your project's local `.agents/skills/` folder.

---

## 🏗️ Architecture

- **`~/.agents/` (Global)**: Contains the persona logic, scripts, and base skills. You install this once on your machine.
- **`.agents/` (Local)**: Exists inside each project. Contains `registry.json`, `skills-lock.json`, and project-specific overrides.

For detailed flow diagrams and persona documentation, see [docs/index.md](./docs/index.md).

## 🛡️ The 12 Specialists

| Role | Responsibility |
|---|---|
| `intent-router` | Analyzes prompts and dispatches specialists |
| `doc-analyst` | Researches documentation and libraries |
| `shared-type-architect`| Owns domain models and schemas |
| `be-architect` | Backend services and APIs |
| `web-architect` | React/Vue web interfaces |
| `mobile-architect`| React Native mobile apps |
| `ai-bridge-specialist` | LLM routing and tools |
| `git-specialist` | Version control with hard guardrails |
| `qa-specialist` | Test design and result analysis |
| `test-runner` | Execution of test suites |
| `doc-updater` | Syncs documentation |
| `file-manager` | Workspace integrity and linting |
