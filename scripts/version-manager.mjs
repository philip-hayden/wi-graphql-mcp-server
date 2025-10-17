#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

function runCommand(command, silent = false) {
  try {
    return execSync(command, { 
      cwd: rootDir,
      stdio: silent ? 'pipe' : 'inherit',
      encoding: 'utf-8'
    }).toString().trim();
  } catch (error) {
    if (silent) return '';
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJson = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
  return packageJson.version;
}

function getNpmVersion(silent = true) {
  try {
    return runCommand('npm view wildlife-insights-mcp version', silent);
  } catch {
    return null;
  }
}

function checkVersionCollision() {
  const localVersion = getCurrentVersion();
  const publishedVersion = getNpmVersion();
  
  if (publishedVersion === localVersion) {
    console.error(`⚠️  Version collision detected!`);
    console.error(`Version ${localVersion} already exists on npm`);
    return true;
  }
  return false;
}

function bumpVersion(type, preid) {
  const versionArg = preid ? `${type} --preid=${preid}` : type;
  console.log(`\n📦 Bumping version (${type})...`);
  const newVersion = runCommand(`npm version ${versionArg}`);
  console.log(`✅ New version: ${newVersion}`);
  return newVersion;
}

function pushChanges() {
  console.log('\n🚀 Pushing changes to remote...');
  runCommand('git push && git push --tags');
  console.log('✅ Changes pushed successfully');
}

function showHelp() {
  console.log(`
Version Manager - Help
=====================

Commands:
  check     - Check for version collisions with npm
  bump      - Bump version and push changes
  status    - Show current version status

Options for bump:
  --type    - Version increment type (patch|minor|major|prerelease)
  --preid   - Prerelease identifier (e.g., beta, alpha)

Examples:
  node scripts/version-manager.mjs check
  node scripts/version-manager.mjs bump --type patch
  node scripts/version-manager.mjs bump --type prerelease --preid beta
  node scripts/version-manager.mjs status
`);
}

function showStatus() {
  const localVersion = getCurrentVersion();
  const publishedVersion = getNpmVersion(true) || 'not published';
  
  console.log('\n📊 Version Status');
  console.log('================');
  console.log(`Local version:     ${localVersion}`);
  console.log(`Published version: ${publishedVersion}`);
  
  if (localVersion === publishedVersion) {
    console.log('\n⚠️  Warning: Local version matches published version');
  }
}

// Main
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'check':
    const hasCollision = checkVersionCollision();
    process.exit(hasCollision ? 1 : 0);
    break;

  case 'bump': {
    const typeIdx = args.indexOf('--type');
    const preidIdx = args.indexOf('--preid');
    
    const type = typeIdx !== -1 ? args[typeIdx + 1] : 'patch';
    const preid = preidIdx !== -1 ? args[preidIdx + 1] : null;
    
    if (!['patch', 'minor', 'major', 'prerelease'].includes(type)) {
      console.error('Invalid version type. Use: patch, minor, major, or prerelease');
      process.exit(1);
    }
    
    bumpVersion(type, preid);
    pushChanges();
    break;
  }

  case 'status':
    showStatus();
    break;

  default:
    showHelp();
    break;
}