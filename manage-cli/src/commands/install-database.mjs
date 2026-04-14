import { DatabaseCLIManager } from '../lib/database-manager.mjs';
import { runCommand, registerWithOpenCLI } from '../lib/opencli.mjs';
import fs from 'fs';
import path from 'path';

export async function installAllFromDatabase(options = {}) {
  const dbManager = new DatabaseCLIManager();

  try {
    // Test database connection
    const connectionTest = await dbManager.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Database connection failed: ${connectionTest.message}`);
    }

    // Get CLIs from database
    const clis = await dbManager.listCLIs();

    if (clis.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'success',
          action: 'install_all_database',
          data: {
            installed: 0,
            clis: []
          }
        }, null, 2));
      } else {
        console.log('No CLIs found in database to install');
        console.log('\nTo add CLIs to database:');
        console.log('  manage-cli add-db <name> <path>');
      }
      return;
    }

    const results = [];
    let successCount = 0;

    if (!options.json) {
      console.log(`🚀 Installing ${clis.length} CLIs from database...\n`);
    }

    for (const cli of clis) {
      const result = { name: cli.name, status: 'pending', error: null };

      try {
        if (!options.json) {
          console.log(`📦 Installing ${cli.name} (${cli.install_type})...`);
        }

        await installSingleCLI(cli, dbManager);

        result.status = 'success';
        successCount++;

        if (!options.json) {
          console.log(`   ✅ ${cli.name} installed successfully`);
        }

      } catch (error) {
        result.status = 'error';
        result.error = error.message;

        if (!options.json) {
          console.log(`   ❌ ${cli.name} failed: ${error.message}`);
        }
      }

      results.push(result);
    }

    // Output final result
    if (options.json) {
      console.log(JSON.stringify({
        status: successCount === clis.length ? 'success' : 'partial',
        action: 'install_all_database',
        data: {
          installed: successCount,
          total: clis.length,
          clis: results
        }
      }, null, 2));
    } else {
      console.log(`\n📊 Installation Summary:`);
      console.log(`✅ Successful: ${successCount}/${clis.length}`);

      if (successCount < clis.length) {
        const failed = results.filter(r => r.status === 'error');
        console.log('\n❌ Failed installations:');
        failed.forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
      }

      if (successCount > 0) {
        console.log('\n🎉 Installed CLIs available via:');
        results.filter(r => r.status === 'success').forEach(r => {
          console.log(`  opencli ${r.name}`);
        });
      }
    }

  } catch (error) {
    throw new Error(`Failed to install CLIs from database: ${error.message}`);
  }
}

async function installSingleCLI(cli, dbManager) {
  switch (cli.install_type) {
    case 'git':
      await installGitCLI(cli);
      break;
    case 'opencli':
    case 'local':
      await installLocalCLI(cli);
      break;
    case 'npx':
      await installNpxCLI(cli);
      break;
    case 'skillport':
      await installSkillportCLI(cli);
      break;
    default:
      throw new Error(`Unknown install type: ${cli.install_type}`);
  }

  // Update install status in database
  await dbManager.updateInstallStatus(cli.name, 'installed');
}

async function installGitCLI(cli) {
  if (!cli.repository_url) {
    throw new Error('No repository URL available');
  }

  const installPath = cli.launcher_path ? path.dirname(cli.launcher_path) :
    path.join(process.env.HOME, 'cli-tools', cli.name);

  if (fs.existsSync(installPath)) {
    // Directory exists, try to pull
    try {
      await runCommand('git', ['pull', 'origin', 'main'], {
        cwd: installPath,
        silent: true
      });
    } catch (error) {
      // If pull fails, continue anyway
    }
  } else {
    // Clone repository
    const parentDir = path.dirname(installPath);
    const repoName = path.basename(installPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await runCommand('git', ['clone', cli.repository_url, repoName], {
      cwd: parentDir,
      silent: true
    });
  }

  // Run npm install if package.json exists
  const packagePath = path.join(installPath, 'package.json');
  if (fs.existsSync(packagePath)) {
    await runCommand('npm', ['install'], {
      cwd: installPath,
      silent: true
    });
  }

  // Register with OpenCLI if launcher exists
  const launcherPath = cli.launcher_path || path.join(installPath, cli.name + '-launcher.js');
  if (fs.existsSync(launcherPath)) {
    await registerWithOpenCLI(launcherPath);
  }
}

async function installLocalCLI(cli) {
  const expandedPath = cli.launcher_path.startsWith('~')
    ? path.join(process.env.HOME, cli.launcher_path.slice(1))
    : cli.launcher_path;

  if (!fs.existsSync(expandedPath)) {
    throw new Error(`Launcher file not found: ${expandedPath}`);
  }

  // Register with OpenCLI
  await registerWithOpenCLI(expandedPath);
}

async function installNpxCLI(cli) {
  // For NPX skills, just run the install command
  const [cmd, ...args] = cli.install_command.split(' ');
  await runCommand(cmd, args, { silent: true });
}

async function installSkillportCLI(cli) {
  // For Skillport skills, just run the install command
  const [cmd, ...args] = cli.install_command.split(' ');
  await runCommand(cmd, args, { silent: true });
}