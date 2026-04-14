import fs from 'fs';
import path from 'path';
import { loadRegistry, saveRegistry, detectGitRepo, getDescription } from '../lib/registry.mjs';
import { registerWithOpenCLI, checkOpenCLIInstalled } from '../lib/opencli.mjs';

export async function addToOpenCLI(name, launcherPath, options = {}) {
  // Validate inputs
  if (!name || !launcherPath) {
    throw new Error('CLI name and launcher path are required');
  }

  // Expand tilde in path
  const expandedPath = launcherPath.startsWith('~')
    ? path.join(process.env.HOME, launcherPath.slice(1))
    : launcherPath;

  // Check if launcher file exists
  if (!fs.existsSync(expandedPath)) {
    throw new Error(`Launcher file not found: ${expandedPath}`);
  }

  // Check if OpenCLI is installed
  if (!(await checkOpenCLIInstalled())) {
    throw new Error('OpenCLI is not installed. Please install it first: npm install -g @jackwener/opencli');
  }

  // Load current registry
  const registry = loadRegistry();

  // Check if CLI already exists
  if (registry.opencli[name]) {
    throw new Error(`CLI '${name}' is already registered`);
  }

  try {
    // Register with OpenCLI
    await registerWithOpenCLI(expandedPath);

    // Add to registry
    registry.opencli[name] = {
      path: launcherPath, // Keep original path format (with ~)
      repo: detectGitRepo(expandedPath),
      description: getDescription(expandedPath)
    };

    // Save registry
    saveRegistry(registry);

    // Output result
    if (options.json) {
      console.log(JSON.stringify({
        status: 'success',
        action: 'add_cli',
        data: {
          name,
          path: launcherPath,
          description: registry.opencli[name].description
        }
      }, null, 2));
    } else {
      console.log(`✅ Added '${name}' to opencli registry`);
      console.log(`   Path: ${launcherPath}`);
      console.log(`   Description: ${registry.opencli[name].description}`);
      if (registry.opencli[name].repo) {
        console.log(`   Repository: ${registry.opencli[name].repo}`);
      }
    }

  } catch (error) {
    throw new Error(`Failed to add CLI: ${error.message}`);
  }
}