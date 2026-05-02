#!/usr/bin/env node
/**
 * validate-registry.js
 * --------------------
 * Validates a project's .agents/registry.json against the global persona library
 * and skills-lock.json. Produces a full audit report.
 *
 * Usage:
 *   node ~/.agents/scripts/validate-registry.js
 *   node ~/.agents/scripts/validate-registry.js --root /path/to/project
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, basename } from 'path';

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
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

const ok   = (msg) => console.log(`  ${c.green}✔${c.reset}  ${msg}`);
const fail = (msg) => console.log(`  ${c.red}✖${c.reset}  ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow}⚠${c.reset}  ${msg}`);
const info = (msg) => console.log(`  ${c.cyan}ℹ${c.reset}  ${msg}`);
const head = (msg) => console.log(`\n${c.bold}${c.blue}${msg}${c.reset}`);

// ─── Persona registry (global) ────────────────────────────────────────────────
const GLOBAL_PERSONAS_DIR = resolve(
  new URL('.', import.meta.url).pathname,
  '../personas'
);

// Personas that have been removed — any registry reference to these is an error
const REMOVED_PERSONAS = ['agent-fe-architect'];
// fe-architect.md has been physically deleted. web/mobile dispatch is handled via workspace "type" field.

const VALID_WORKSPACE_TYPES    = ['web', 'mobile', 'backend', 'shared', 'ai', 'docs', 'tooling'];
const VALID_PACKAGE_MANAGERS   = ['bun', 'npm', 'pnpm', 'yarn'];
const VALID_TEST_RUNNERS       = ['bun:test', 'vitest', 'jest', 'detox', 'mocha', 'custom'];
const VALID_COMMIT_STYLES      = ['conventional-commits', 'angular', 'gitmoji', 'custom'];
const PROTECTED_BRANCH_MINIMUM = ['main', 'master'];

let errors   = 0;
let warnings = 0;

function error(msg)   { fail(msg); errors++; }
function warning(msg) { warn(msg); warnings++; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function getAvailablePersonas() {
  if (!existsSync(GLOBAL_PERSONAS_DIR)) return new Set();
  return new Set(
    readdirSync(GLOBAL_PERSONAS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        // Extract name from YAML frontmatter
        const content = readFileSync(join(GLOBAL_PERSONAS_DIR, f), 'utf-8');
        const match = content.match(/^name:\s*(.+)$/m);
        return match ? match[1].trim() : basename(f, '.md');
      })
  );
}

// ─── Validation checks ────────────────────────────────────────────────────────
function checkProject(project) {
  head('① Project Metadata');
  if (!project)           { error('Missing "project" key in registry.json'); return; }
  if (!project.name)      { error('"project.name" is required'); } else { ok(`name: ${project.name}`); }
  if (!project.root)      { warning('"project.root" not set — defaulting to "."'); } else { ok(`root: ${project.root}`); }
  if (!VALID_PACKAGE_MANAGERS.includes(project.packageManager)) {
    warning(`"project.packageManager" is "${project.packageManager}" — expected one of: ${VALID_PACKAGE_MANAGERS.join(', ')}`);
  } else {
    ok(`packageManager: ${project.packageManager}`);
  }
  if (!VALID_TEST_RUNNERS.includes(project.testRunner)) {
    warning(`"project.testRunner" is "${project.testRunner}" — expected one of: ${VALID_TEST_RUNNERS.join(', ')}`);
  } else {
    ok(`testRunner: ${project.testRunner}`);
  }
}

function checkWorkspaces(workspaces, projectRoot, availablePersonas) {
  head('② Workspace Definitions');
  if (!workspaces || typeof workspaces !== 'object') {
    error('"workspaces" key is missing or invalid');
    return;
  }

  for (const [key, ws] of Object.entries(workspaces)) {
    const prefix = `workspaces.${key}`;

    // Check for removed personas
    if (REMOVED_PERSONAS.includes(ws.specialist)) {
      error(`${prefix}.specialist = "${ws.specialist}" — THIS PERSONA HAS BEEN REMOVED. Use "agent-web-architect" or "agent-mobile-architect" instead.`);
      continue;
    }

    // Check specialist exists
    if (!ws.specialist) {
      error(`${prefix} is missing "specialist" field`);
    } else if (!availablePersonas.has(ws.specialist)) {
      error(`${prefix}.specialist = "${ws.specialist}" — no matching persona found in ~/.agents/personas/`);
    } else {
      ok(`${prefix}: ${ws.specialist}`);
    }

    // Check path exists
    if (!ws.path) {
      error(`${prefix} is missing "path" field`);
    } else {
      const absPath = resolve(projectRoot, ws.path);
      if (!existsSync(absPath)) {
        warning(`${prefix}.path "${ws.path}" does not exist yet (OK if not created yet)`);
      } else {
        ok(`${prefix}.path exists: ${ws.path}`);
      }
    }

    // Type-specific checks
    if (ws.type && !VALID_WORKSPACE_TYPES.includes(ws.type)) {
      warning(`${prefix}.type = "${ws.type}" — unexpected value. Valid: ${VALID_WORKSPACE_TYPES.join(', ')}`);
    }

    // Mobile-specific
    if (ws.type === 'mobile') {
      if (!ws.config?.framework) warning(`${prefix} is type "mobile" but missing config.framework`);
      if (!ws.config?.version)   warning(`${prefix} is type "mobile" but missing config.version`);
      if (ws.specialist !== 'agent-mobile-architect') {
        error(`${prefix} is type "mobile" but specialist is "${ws.specialist}" — must be "agent-mobile-architect"`);
      }
    }

    // Web-specific
    if (ws.type === 'web' && ws.specialist !== 'agent-web-architect') {
      error(`${prefix} is type "web" but specialist is "${ws.specialist}" — must be "agent-web-architect"`);
    }
  }
}

function checkGit(git) {
  head('③ Git Configuration');
  if (!git) { warning('"git" block not configured — using global defaults'); return; }

  const protected_ = git.protectedBranches ?? [];
  const missingMin = PROTECTED_BRANCH_MINIMUM.filter(b => !protected_.includes(b));
  if (missingMin.length > 0) {
    warning(`Protected branches list is missing recommended entries: ${missingMin.join(', ')}`);
  } else {
    ok(`protectedBranches: ${protected_.join(', ')}`);
  }

  if (!git.defaultBase) {
    warning('"git.defaultBase" not set — defaulting to "main"');
  } else {
    ok(`defaultBase: ${git.defaultBase}`);
  }

  if (git.commitStyle && !VALID_COMMIT_STYLES.includes(git.commitStyle)) {
    warning(`"git.commitStyle" = "${git.commitStyle}" — expected one of: ${VALID_COMMIT_STYLES.join(', ')}`);
  } else if (git.commitStyle) {
    ok(`commitStyle: ${git.commitStyle}`);
  }
}

function checkSkillsLock(agentsDir) {
  head('④ Skills Lock');
  const lockPath = join(agentsDir, 'skills-lock.json');
  if (!existsSync(lockPath)) {
    warning('skills-lock.json not found — run init-project.js to generate one');
    return;
  }

  const lock = readJSON(lockPath);
  if (!lock) { error('skills-lock.json is not valid JSON'); return; }

  const required = lock.required ?? [];
  const optional = lock.optional ?? [];

  // Check that context7 and security-best-practices are always required
  const baseRequired = ['context7', 'security-best-practices'];
  for (const skill of baseRequired) {
    if (!required.includes(skill)) {
      warning(`"${skill}" should be in required skills — it is a base skill for all agents`);
    } else {
      ok(`base skill present: ${skill}`);
    }
  }

  info(`Required skills (${required.length}): ${required.join(', ')}`);
  info(`Optional skills (${optional.length}): ${optional.join(', ')}`);

  // Check local skills dir if it exists
  const localSkillsDir = join(agentsDir, 'skills');
  if (existsSync(localSkillsDir)) {
    const localSkills = readdirSync(localSkillsDir).filter(f =>
      readdirSync(join(localSkillsDir, f)).includes('SKILL.md')
    );
    const allDeclared = [...required, ...optional];
    for (const skill of localSkills) {
      if (!allDeclared.includes(skill)) {
        warning(`Local skill "${skill}" exists but is not declared in skills-lock.json`);
      }
    }
    for (const skill of required) {
      if (!localSkills.includes(skill)) {
        warning(`Required skill "${skill}" is not installed in .agents/skills/`);
      }
    }
  } else {
    warning('.agents/skills/ directory not found in project — ensure required skills are installed before proceeding');
  }
}

function checkPermissions(permissions, workspaces) {
  head('⑤ Permissions');
  if (!permissions) { info('"permissions" block not set — using defaults'); return; }

  const knownAgents = ['agent-file-manager', 'agent-qa-specialist', 'agent-test-runner'];
  for (const agent of knownAgents) {
    if (permissions[agent]) {
      ok(`${agent} permissions configured`);
    } else {
      info(`${agent} permissions not explicitly set — using defaults`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const args       = process.argv.slice(2);
  const rootIdx    = args.indexOf('--root');
  const projectRoot = rootIdx !== -1 && args[rootIdx + 1]
    ? resolve(args[rootIdx + 1])
    : process.cwd();

  const agentsDir  = join(projectRoot, '.agents');
  const registryPath = join(agentsDir, 'registry.json');

  console.log(`\n${c.bold}${c.blue}🔍 Agent Registry Validator${c.reset}`);
  info(`Project root : ${projectRoot}`);
  info(`Registry     : ${registryPath}`);

  if (!existsSync(registryPath)) {
    fail(`registry.json not found at: ${registryPath}`);
    fail('Run: node ~/.agents/scripts/init-project.js --output <project-root>');
    process.exit(1);
  }

  const registry = readJSON(registryPath);
  if (!registry) {
    fail('registry.json is not valid JSON');
    process.exit(1);
  }

  const availablePersonas = getAvailablePersonas();
  info(`Global personas found: ${availablePersonas.size}`);

  checkProject(registry.project);
  checkWorkspaces(registry.workspaces, projectRoot, availablePersonas);
  checkGit(registry.git);
  checkSkillsLock(agentsDir);
  checkPermissions(registry.permissions, registry.workspaces);

  // ── Final report ───────────────────────────────────────────────────────────
  head('📋 Audit Report');
  if (errors === 0 && warnings === 0) {
    console.log(`  ${c.green}${c.bold}✔ Registry is valid. No issues found.${c.reset}`);
  } else {
    if (errors > 0)   fail(`${errors} error(s) must be fixed before this registry is usable.`);
    if (warnings > 0) warn(`${warnings} warning(s) — review but not blocking.`);
  }

  console.log('');
  process.exit(errors > 0 ? 1 : 0);
}

main();
