# Orchestration Flow

Visual diagrams showing how agents collaborate across a full development lifecycle.

---

## 1. High-Level Agent Ecosystem

```mermaid
graph TD
    USER([👤 Developer]) --> IR[🧭 intent-router\nTech Lead & Dispatcher]

    IR -->|Research needed| DA[🔍 doc-analyst\nResearch Analyst]
    IR -->|New entities/schemas| STA[🔒 shared-type-architect\nDomain Lock Authority]
    IR -->|Backend work| BE[🖥️ be-architect\nBackend Architect]
    IR -->|Web UI — registry type=web| WA[🌐 web-architect\nWeb Architect]
    IR -->|Mobile — registry type=mobile| MA[📱 mobile-architect\nMobile Architect]
    IR -->|AI/LLM work| AI[🤖 ai-bridge-specialist\nAI Bridge]
    IR -->|Git operations| GIT[🔀 git-specialist\nVersion Control]
    IR -->|Write specs & analyze| QA[🧪 qa-specialist\nTest Design & Analysis]
    IR -->|Execute tests| TR[▶️ test-runner\nTest Executor]
    IR -->|After implementation| DU[📝 doc-updater\nDoc Synchronizer]
    IR -->|Audit/lint/config| FM[🗂️ file-manager\nWorkspace Integrity]

    DA -.->|Context feed| BE & WA & MA & AI

    STA -->|Types verified ✅| BE & WA & MA & AI

    BE & WA & MA & AI -->|Changes complete| GIT
    GIT -->|Branch/commit ready| QA
    QA -->|Spec files ready| TR
    TR -->|Execution report| QA
    QA -->|Analysis complete| DU & GIT
    DU & GIT -->|All clear| FM
```

---

## 2. Fast Path Flow (Single-File Edits)

```mermaid
sequenceDiagram
    actor Dev as 👤 Developer
    participant IR as 🧭 intent-router
    participant SP as Specialist

    Dev->>IR: Request (small change)
    IR->>IR: Read registry.json
    IR->>IR: Analyze scope → Fast Path
    IR-->>Dev: [DEV-ROUTE]: FastPath | [EQUIP]: <Specialist>
    IR->>SP: Hand off task
    SP->>SP: Implement change
    SP-->>Dev: [IMPLEMENTATION SUMMARY]
```

---

## 3. Planning Path Flow (Multi-File / Feature Work)

```mermaid
sequenceDiagram
    actor Dev as 👤 Developer
    participant IR as 🧭 intent-router
    participant DA as 🔍 doc-analyst
    participant STA as 🔒 shared-type-architect
    participant SP as Implementer (BE / Web / Mobile / AI)
    participant GIT as 🔀 git-specialist
    participant QA as 🧪 qa-specialist
    participant TR as ▶️ test-runner
    participant DU as 📝 doc-updater
    participant FM as 🗂️ file-manager

    Dev->>IR: Request (feature / architecture)
    IR->>IR: Read registry.json → Planning Path
    IR->>DA: Fetch project context
    DA-->>IR: [CONTEXT SUMMARY]

    alt New entities required
        IR->>STA: Define types & schemas
        STA-->>Dev: [TYPES READY FOR REVIEW]
        Dev-->>IR: ✅ Types approved
    end

    IR->>GIT: Create feature branch
    GIT-->>IR: [GIT — BRANCH] feat/<name> created

    IR->>QA: Write test specs for feature
    QA-->>IR: [QA — TEST DESIGN] specs ready

    IR->>SP: Assign implementation
    SP->>SP: TDD → Implement → Report
    SP-->>IR: [IMPLEMENTATION SUMMARY]

    IR->>GIT: Commit changes
    GIT-->>IR: [GIT — COMMIT] hash + message

    IR->>TR: Execute test suite
    TR-->>QA: [TEST EXECUTION REPORT]
    QA->>QA: Triage failures, identify gaps
    QA-->>IR: [QA — ANALYSIS]

    par Closure Phase
        IR->>DU: Sync documentation
        IR->>GIT: Open Pull Request
    end

    DU-->>IR: [DOCS SYNC SUMMARY]
    GIT-->>Dev: [GIT — PR] URL + linked issues

    IR->>FM: Audit workspace integrity
    FM-->>Dev: [WORKSPACE AUDIT REPORT]
```

---

## 4. QA ↔ Test Runner Collaboration Loop

```mermaid
sequenceDiagram
    participant QA as 🧪 qa-specialist\n(Design & Analysis)
    participant TR as ▶️ test-runner\n(Execution)
    participant IR as 🧭 intent-router
    participant SP as Implementer

    QA->>QA: Write specs (Given/When/Then)
    QA-->>TR: [QA — TEST DESIGN] specs ready

    loop Until all tests pass
        TR->>TR: Execute test suite
        TR-->>QA: [TEST EXECUTION REPORT]
        QA->>QA: Triage failures

        alt Spec is wrong
            QA->>QA: Rewrite spec
            QA-->>TR: Updated specs → re-run
        else Feature has a bug
            QA-->>IR: [BUG REPORT] escalate to implementer
            IR->>SP: Fix bug
            SP-->>TR: Re-run tests
        else Coverage gap found
            QA->>QA: Write new specs
            QA-->>TR: New specs → re-run
        end
    end

    QA-->>IR: ✅ All passing — analysis complete
```

---

## 5. Git Specialist — Guardrail Decision Tree

```mermaid
flowchart TD
    GR([Git Operation Requested]) --> CHECK{Is target\na protected branch?}

    CHECK -->|No — safe branch| SAFE[Execute operation ✅]
    CHECK -->|Yes — protected| CMD{Operation type?}

    CMD -->|Read-only: log, status, diff| SAFE
    CMD -->|Create branch FROM protected| SAFE
    CMD -->|Regular push to feature branch| SAFE
    CMD -->|Delete protected branch| BLOCK
    CMD -->|Force push to protected| BLOCK
    CMD -->|Reset --hard on protected| BLOCK
    CMD -->|Rebase -i on protected| WARN["Warn + require explicit\nconfirmation ⚠️"]

    BLOCK["[GIT GUARDRAIL TRIGGERED]\nForbidden: destructive on protected branch\nSuggest safe alternative ❌"]
    SAFE --> OUT[Execute + report output contract]
```

---

## 6. Frontend Dispatch — Registry-Driven Routing

```mermaid
flowchart TD
    REQ([Frontend Task]) --> IR[intent-router reads registry.json]
    IR --> FIND{Find workspace\nmatching file path}

    FIND -->|workspace.type = web| WA[🌐 agent-web-architect]
    FIND -->|workspace.type = mobile| MA[📱 agent-mobile-architect]
    FIND -->|fe-architect referenced| ERR["❌ ESCALATION\nfe-architect is REMOVED\nUpdate registry.json"]
    FIND -->|No match found| ESC["❌ ESCALATION\nDefine workspace type\nin registry.json"]

    WA --> IMPL1[Web implementation]
    MA --> IMPL2[Mobile implementation]
```

---

## 7. Workspace Boundary Map

```mermaid
graph LR
    subgraph Global ["~/.agents (Global)"]
        P[personas/]
        D[docs/]
        S[scripts/]
    end

    subgraph Project [".agents (Per Project)"]
        PR[registry.json]
        SK[skills/]
        WF[workflows/]
        BN[bin/]
        SL[skills-lock.json]
        PO["personas/overrides.md"]
    end

    subgraph Workspaces ["Project Workspaces"]
        SH[packages/shared/]
        BK[apps/service/]
        WB[apps/web/]
        MB[apps/mobile/]
        AB[apps/ai-bridge/]
        DC[docs/]
        TS["__tests__/ e2e/"]
    end

    P -->|personas loaded by| PR
    PR -->|maps paths to specialists| Workspaces
    SL -->|base skills enforced| P

    PR -- "shared-type-architect" --> SH
    PR -- "be-architect" --> BK
    PR -- "web-architect (type=web)" --> WB
    PR -- "mobile-architect (type=mobile)" --> MB
    PR -- "ai-bridge-specialist" --> AB
    PR -- "doc-updater" --> DC
    PR -- "qa-specialist (write)" --> TS
    PR -- "test-runner (execute)" --> TS
```

---

## 8. Skill Loading Order

```mermaid
flowchart LR
    A([Agent Activated]) --> B["Base Skills\ncontext7\nsecurity-best-practices"]
    B --> C["Project Required Skills\nskills-lock.json → required[]"]
    C --> D["Project Optional Skills\nskills-lock.json → optional[]"]
    D --> E["Global Persona\n~/.agents/personas/<name>.md"]
    E --> F["Project Override\n.agents/personas/overrides.md"]
    F --> G([Ready])
```
