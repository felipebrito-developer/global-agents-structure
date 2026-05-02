# IDE Adapter Templates

This directory contains configuration files for loading the `~/.agents` persona system into different AI IDEs. The **personas themselves are identical across IDEs** — only the loading mechanism differs.

---

## Available Adapters

| Directory | IDE / Tool |
|---|---|
| `claude-code/` | Claude Code (Anthropic) — uses `CLAUDE.md` |
| `kiro/` | Amazon Kiro — uses `.kiro/steering/` files |
| `cursor/` | Cursor — uses `.cursorrules` or `cursor-rules.md` |
| `antigravity/` | Antigravity (Google DeepMind) — uses user rules |

---

## How to Use

1. Copy the adapter file(s) into your project
2. Edit the file to point to your project's registry and persona paths
3. The AI will load the orchestrator protocol automatically at session start

See `~/.agents/docs/ide-compatibility.md` for full setup instructions per IDE.
