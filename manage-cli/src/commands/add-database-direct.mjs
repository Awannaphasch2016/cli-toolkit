import fs from 'fs';
import path from 'path';
import { DirectDatabaseManager } from '../lib/direct-db-manager.mjs';
import { registerWithOpenCLI, checkOpenCLIInstalled } from '../lib/opencli.mjs';
import { detectGitRepo, getDescription } from '../lib/registry.mjs';

export async function addToDirectDatabase(name, launcherPath, options = {}) {
  // Validate inputs
  if (!name || !launcherPath) {
    throw new Error('CLI name and launcher path are required');
  }

  const dbManager = new DirectDatabaseManager();

  try {
    // Test database connection
    const connectionTest = await dbManager.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Database connection failed: ${connectionTest.message}`);
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

    // Check if CLI already exists
    const existingCLI = await dbManager.getCLI(name);
    if (existingCLI) {
      throw new Error(`CLI '${name}' is already managed in database`);
    }

    // Extract metadata
    const repo = detectGitRepo(expandedPath);
    const description = getDescription(expandedPath);

    // Determine install type
    const installType = DirectDatabaseManager.determineInstallType(
      launcherPath,
      repo,
      description
    );

    // Generate install command
    const installCommand = DirectDatabaseManager.generateInstallCommand(
      installType,
      launcherPath,
      repo,
      name
    );

    // Register with OpenCLI first
    await registerWithOpenCLI(expandedPath);

    // Add to database
    const cliData = await dbManager.addCLI(
      name,
      installType,
      installCommand,
      description,
      repo,
      launcherPath
    );

    // Mark as installed since we just registered it
    await dbManager.updateInstallStatus(name, 'installed');

    // Output result
    if (options.json) {
      console.log(JSON.stringify({
        status: 'success',
        action: 'add_cli_database',
        data: {
          name,
          install_type: installType,
          install_command: installCommand,
          description,
          repository: repo,
          path: launcherPath
        }
      }, null, 2));
    } else {
      console.log(`✅ Added '${name}' to database`);
      console.log(`   Type: ${installType}`);
      console.log(`   Command: ${installCommand}`);
      console.log(`   Path: ${launcherPath}`);
      console.log(`   Description: ${description}`);
      if (repo) {
        console.log(`   Repository: ${repo}`);
      }
    }

  } catch (error) {
    throw new Error(`Failed to add CLI to database: ${error.message}`);
  } finally {
    await dbManager.close();
  }
}