import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '..', '..', 'registry.json');

export function loadRegistry() {
  try {
    const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Create default registry if it doesn't exist
      const defaultRegistry = {
        version: "1.0.0",
        opencli: {}
      };
      saveRegistry(defaultRegistry);
      return defaultRegistry;
    }
    throw error;
  }
}

export function saveRegistry(registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

export function detectGitRepo(launcherPath) {
  try {
    const dir = path.dirname(launcherPath);
    const gitPath = path.join(dir, '.git');

    if (fs.existsSync(gitPath)) {
      // Try to get remote URL
      const { execSync } = require('child_process');
      const remote = execSync('git remote get-url origin', { cwd: dir, encoding: 'utf8' }).trim();
      return remote;
    }
  } catch (error) {
    // Ignore errors, return null if can't detect
  }
  return null;
}

export function getDescription(launcherPath) {
  try {
    const dir = path.dirname(launcherPath);
    const packagePath = path.join(dir, 'package.json');

    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return pkg.description || 'No description available';
    }
  } catch (error) {
    // Ignore errors
  }
  return 'No description available';
}