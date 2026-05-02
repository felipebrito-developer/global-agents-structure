#!/usr/bin/env node
/**
 * init-project.js
 * ---------------
 * Scaffolds the .agents/ directory for a new project.
 * Creates registry.json, skills-lock.json, and workflow/persona stubs.
 *
 * Usage:
 *   node ~/.agents/scripts/init-project.js [--output <path>]
 *   node ~/.agents/scripts/init-project.js --output ./my-project
 */

import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  blue:   '\x1b[34m',
};
const log   = (msg)         => console.log(msg);
const ok    = (msg)         => console.log(`${c.green}✔${c.reset}  ${msg}`);
const info  = (msg)         => console.log(`${c.cyan}ℹ${c.reset}  ${msg}`);
const warn  = (msg)         => console.log(`${c.yellow}⚠${c.reset}  ${msg}`);
const err   = (msg)         => console.log(`${c.red}✖${c.reset}  ${msg}`);
const title = (msg)         => console.log(`\n${c.bold}${c.blue}${msg}${c.reset}`);
const dim   = (msg)         => console.log(`${c.dim}${msg}${c.reset}`);

// ─── Readline prompt helper ───────────────────────────────────────────────────
function prompt(rl, question, defaultVal = '') {
  return new Promise((resolve) => {
    const hint = defaultVal ? ` ${c.dim}[${defaultVal}]${c.reset}` : '';
    rl.question(`  ${question}${hint}: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function promptChoice(rl, question, choices, defaultIdx = 0) {
  const display = choices.map((c, i) => `${i + 1}. ${c}`).join('  |  ');
  return new Promise((resolve) => {
    rl.question(`  ${question}\n  ${display}\n  Choice [${defaultIdx + 1}]: `, (answer) => {
      const idx = parseInt(answer.trim(), 10) - 1;
      resolve(choices[Number.isNaN(idx) || idx < 0 || idx >= choices.length ? defaultIdx : idx]);
    });
  });
}

function promptMulti(rl, question, choices) {
  const display = choices.map((c, i) => `${i + 1}. ${c}`).join('  |  ');
  return new Promise((resolve) => {
    rl.question(
      `  ${question} (comma-separated numbers, or 0 for none)\n  ${display}\n  Choices: `,
      (answer) => {
        if (answer.trim() === '0') { resolve([]); return; }
        const selected = answer.split(',')
          .map(s => parseInt(s.trim(), 10) - 1)
          .filter(i => i >= 0 && i < choices.length)
          .map(i => choices[i]);
        resolve(selected);
      }
    );
  });
}

// ─── Skill matrices ───────────────────────────────────────────────────────────
const BASE_SKILLS = ['context7', 'security-best-practices'];

const SKILL_MAP = {
  backend:  ['nodejs-backend-patterns', 'drizzle-orm', 'sqlite-database-expert', 'zod', 'mcp-builder', 'claude-api'],
  web:      ['ui-component-patterns', 'jotai-expert', 'tanstack-start-best-practices', 'zod'],
  mobile:   ['react-native-best-practices', 'vercel-react-native-skills', 'react-native-design',
             'mobile-android-design', 'jotai-expert', 'mobile-offline-support',
             'sqlite-database-expert', 'upgrading-react-native', 'adhd-design-expert'],
  ai:       ['claude-api', 'mcp-builder', 'nodejs-backend-patterns'],
  shared:   ['zod', 'drizzle-orm', 'sqlite-database-expert'],
  tooling:  ['validate-skills'],
};

// ─── Template builders ────────────────────────────────────────────────────────
function buildRegistry({ name, description, packageManager, testRunner, linter, workspaces, git }) {
  const testCmd = testRunner === 'bun:test' ? 'bun test' :
                  testRunner === 'vitest'   ? 'npx vitest run' :
                  testRunner === 'jest'     ? 'npx jest' :
                  testRunner === 'detox'    ? 'npx detox test' : testRunner;

  return {
    _version: 'registry/v1',
    project: { name, description, root: '.', packageManager, testRunner, linter },
    workspaces,
    git,
    permissions: {
      'agent-file-manager': {
        allowedRoots: ['.', '.agents/'],
        lintCommand: linter,
      },
      'agent-qa-specialist': {
        writeAccess: ['**/*.spec.ts', '**/*.test.ts', 'e2e/**', '__tests__/**', 'test-plans/**'],
      },
      'agent-test-runner': {
        functionalCommand: testCmd,
        regressionCommand: `${testCmd} --coverage`,
        e2eCommand: testRunner === 'detox' ? 'npx detox test' : 'npx playwright test',
        smokeTag: '--grep @smoke',
        requireCleanWorkingTree: false,
        coverageThreshold: 80,
      },
    },
  };
}

function buildSkillsLock(activeWorkspaceTypes) {
  const required = [...BASE_SKILLS];
  const optional = [];

  for (const type of activeWorkspaceTypes) {
    const skills = SKILL_MAP[type] ?? [];
    for (const skill of skills) {
      if (!required.includes(skill) && !optional.includes(skill)) {
        optional.push(skill);
      }
    }
  }

  return { required, optional };
}

function buildProjectOverrideMd({ name, workspaces }) {
  const mobileWs = workspaces.find(w => w.type === 'mobile');
  const webWs    = workspaces.find(w => w.type === 'web');

  const sections = [];

  if (mobileWs) {
    sections.push(`## Mobile Override
- **Write Access**: \`${mobileWs.path}\`
- **Framework**: ${mobileWs.config?.framework ?? 'react-native'}
- Add project-specific design system rules and import constraints here.`);
  }
  if (webWs) {
    sections.push(`## Web Override
- **Write Access**: \`${webWs.path}\`
- Add project-specific component library or styling rules here.`);
  }

  return `---
name: project-overrides
description: Project-specific overrides for ${name}. Extends global personas with local constraints.
---

# ${name} — Agent Overrides

${sections.join('\n\n')}

## Shared Type Import Mandate
All specialists MUST import core entity types from the project's shared types package.
Never define local entity types in feature code.
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Parse --output flag
  const args = process.argv.slice(2);
  let outputRoot = '.';
  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    outputRoot = resolve(args[outputIdx + 1]);
  }

  title('🤖  Agent Project Initializer');
  dim(`  Scaffolding .agents/ in: ${resolve(outputRoot)}`);
  log('');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    // ── Step 1: Project metadata ──────────────────────────────────────────────
    title('Step 1 / 5 — Project Identity');
    const name        = await prompt(rl, 'Project name (kebab-case)', 'my-project');
    const description = await prompt(rl, 'Short description', 'A new project');

    // ── Step 2: Tooling ───────────────────────────────────────────────────────
    title('Step 2 / 5 — Tooling');
    const packageManager = await promptChoice(rl, 'Package manager', ['bun', 'npm', 'pnpm', 'yarn'], 0);
    const testRunner     = await promptChoice(rl, 'Test runner',     ['bun:test', 'vitest', 'jest', 'detox', 'custom'], 0);
    const linterChoices  = ['bun biome check --write .', 'npx eslint --fix .', 'npx prettier --write .', 'none'];
    const linter         = await promptChoice(rl, 'Linter / formatter', linterChoices, 0);

    // ── Step 3: Workspace types ───────────────────────────────────────────────
    title('Step 3 / 5 — Workspaces');
    const wsTypes = await promptMulti(rl, 'Which workspace types does this project have?',
      ['shared-types', 'backend', 'web', 'mobile', 'ai-bridge']);

    const workspaces = {};
    const wsTypeKeys = [];

    for (const wsType of wsTypes) {
      switch (wsType) {
        case 'shared-types': {
          const path = await prompt(rl, 'Shared types path', 'packages/shared/');
          workspaces.shared = { path, specialist: 'agent-shared-type-architect' };
          wsTypeKeys.push('shared');
          break;
        }
        case 'backend': {
          const path = await prompt(rl, 'Backend path', 'apps/service/');
          workspaces.backend = { path, specialist: 'agent-be-architect' };
          wsTypeKeys.push('backend');
          break;
        }
        case 'web': {
          const path      = await prompt(rl, 'Web frontend path', 'apps/web/');
          const framework = await promptChoice(rl, 'Web framework', ['react', 'next', 'tanstack-start', 'vue', 'vanilla'], 0);
          workspaces.web = { path, type: 'web', specialist: 'agent-web-architect', config: { framework } };
          wsTypeKeys.push('web');
          break;
        }
        case 'mobile': {
          const path      = await prompt(rl, 'Mobile app path', 'apps/mobile/');
          const framework = await promptChoice(rl, 'Mobile framework', ['react-native', 'expo-managed', 'expo-bare'], 0);
          const version   = await prompt(rl, `${framework} version`, framework === 'react-native' ? '0.78' : '52');
          workspaces.mobile = { path, type: 'mobile', specialist: 'agent-mobile-architect', config: { framework, version } };
          wsTypeKeys.push('mobile');
          break;
        }
        case 'ai-bridge': {
          const path          = await prompt(rl, 'AI bridge path', 'apps/ai-bridge/');
          const localProvider = await promptChoice(rl, 'Local LLM provider', ['ollama', 'lm-studio', 'none'], 0);
          const cloudProvider = await promptChoice(rl, 'Cloud LLM provider', ['gemini', 'claude', 'openai', 'none'], 0);
          workspaces.ai = {
            path,
            specialist: 'agent-ai-bridge-specialist',
            config: {
              localProvider,
              localProviderUrl: localProvider === 'ollama' ? 'http://localhost:11434' : '',
              cloudProvider,
            },
          };
          wsTypeKeys.push('ai');
          break;
        }
      }
    }

    // Always add docs workspace
    const docsPath = await prompt(rl, 'Docs path', 'docs/');
    workspaces.docs = { path: docsPath, specialist: 'agent-doc-updater' };

    // ── Step 4: Git config ────────────────────────────────────────────────────
    title('Step 4 / 5 — Git Configuration');
    const defaultBase         = await prompt(rl, 'Default base branch', 'main');
    const extraProtected      = await prompt(rl, 'Extra protected branches (comma-separated, or leave blank)', '');
    const requireLinkedIssue  = await promptChoice(rl, 'Require linked issue on PRs?', ['yes', 'no'], 0);
    const hostCli             = await promptChoice(rl, 'VCS host CLI', ['gh (GitHub)', 'glab (GitLab)', 'none'], 0);

    const protectedBranches = ['main', 'master', 'production', `release/*`];
    if (extraProtected) {
      extraProtected.split(',').map(b => b.trim()).filter(Boolean).forEach(b => {
        if (!protectedBranches.includes(b)) protectedBranches.push(b);
      });
    }

    const git = {
      protectedBranches,
      defaultBase,
      branchNamingPattern: '<type>/<description>',
      commitStyle: 'conventional-commits',
      requireLinkedIssue: requireLinkedIssue === 'yes',
      hostCli: hostCli.startsWith('gh') ? 'gh' : hostCli.startsWith('glab') ? 'glab' : 'none',
      prTemplate: '.github/pull_request_template.md',
    };

    // ── Step 5: Preview & confirm ─────────────────────────────────────────────
    title('Step 5 / 5 — Preview');
    const registry     = buildRegistry({ name, description, packageManager, testRunner, linter, workspaces, git });
    const skillsLock   = buildSkillsLock(wsTypeKeys);
    const overrideMd   = buildProjectOverrideMd({ name, workspaces: Object.values(workspaces) });

    log(`\n  ${c.bold}Registry workspaces:${c.reset}`);
    for (const [key, ws] of Object.entries(workspaces)) {
      log(`    ${c.green}${key}${c.reset} → ${ws.path} (${ws.specialist})`);
    }
    log(`\n  ${c.bold}Skills:${c.reset}`);
    log(`    Required : ${skillsLock.required.join(', ')}`);
    log(`    Optional : ${skillsLock.optional.join(', ')}`);
    log('');

    const confirmed = await promptChoice(rl, 'Write these files?', ['yes', 'no'], 0);
    if (confirmed !== 'yes') {
      warn('Aborted. No files written.');
      rl.close();
      return;
    }

    // ── Write files ───────────────────────────────────────────────────────────
    const agentsDir    = join(outputRoot, '.agents');
    const personasDir  = join(agentsDir, 'personas');
    const workflowsDir = join(agentsDir, 'workflows');
    const binDir       = join(agentsDir, 'bin');

    for (const dir of [agentsDir, personasDir, workflowsDir, binDir]) {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    }

    writeFileSync(join(agentsDir, 'registry.json'),    JSON.stringify(registry, null, 2) + '\n');
    writeFileSync(join(agentsDir, 'skills-lock.json'), JSON.stringify(skillsLock, null, 2) + '\n');
    writeFileSync(join(personasDir, 'overrides.md'),   overrideMd);

    // Minimal workflow stub
    const orchestrationMd = `# Orchestration Workflow — ${name}

Follow the global orchestration flow in \`~/.agents/docs/orchestration-flow.md\`.

## Project-Specific Notes
- Add any project-specific routing rules here.
- Reference the registry.json workspace paths when dispatching.
`;
    writeFileSync(join(workflowsDir, 'orchestration.md'), orchestrationMd);

    log('');
    ok(`registry.json     → ${join(agentsDir, 'registry.json')}`);
    ok(`skills-lock.json  → ${join(agentsDir, 'skills-lock.json')}`);
    ok(`personas/overrides.md → ${join(personasDir, 'overrides.md')}`);
    ok(`workflows/orchestration.md → ${join(workflowsDir, 'orchestration.md')}`);

    title('✅  Done!');
    info(`Run \`node ~/.agents/scripts/validate-registry.js --root ${outputRoot}\` to validate.`);
    log('');

  } finally {
    rl.close();
  }
}

main().catch((e) => { err(e.message); process.exit(1); });
