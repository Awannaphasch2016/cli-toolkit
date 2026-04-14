import fs from 'fs';
import path from 'path';
import { loadRegistry } from '../lib/registry.mjs';
import { runCommand, registerWithOpenCLI, checkOpenCLIInstalled } from '../lib/opencli.mjs';

export async function installAllOpenCLI(options = {}) {
  // Check if OpenCLI is installed
  if (!(await checkOpenCLIInstalled())) {
    throw new Error('OpenCLI is not installed. Please install it first: npm install -g @jackwener/opencli');
  }

  try {
    // Load current registry
    const registry = loadRegistry();

    const clis = registry.opencli;
    const cliNames = Object.keys(clis);

    if (cliNames.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'success',
          action: 'install_all',
          data: {
            installed: 0,
            clis: []
          }
        }, null, 2));
      } else {
        console.log('No CLIs found in registry to install');
      }
      return;
    }

    const results = [];
    let successCount = 0;

    if (!options.json) {
      console.log(`Installing ${cliNames.length} CLIs from registry...`);
      console.log('');
    }

    for (const name of cliNames) {
      const info = clis[name];
      const result = { name, status: 'pending', error: null };

      try {
        if (!options.json) {
          console.log(`Installing ${name}...`);
        }

        // Expand tilde in path
        const expandedPath = info.path.startsWith('~')
          ? path.join(process.env.HOME, info.path.slice(1))
          : info.path;

        // If repo exists, try to clone/pull
        if (info.repo) {
          const repoDir = path.dirname(expandedPath);

          if (fs.existsSync(repoDir)) {
            // Directory exists, try to pull
            try {
              await runCommand('git', ['pull', 'origin', 'main'], {
                cwd: repoDir,
                silent: true
              });
            } catch (error) {
              // If pull fails, it might not be a git repo or wrong branch
              // Continue anyway
            }
          } else {
            // Clone repository
            const parentDir = path.dirname(repoDir);
            const repoName = path.basename(repoDir);

            if (!fs.existsSync(parentDir)) {
              fs.mkdirSync(parentDir, { recursive: true });
            }

            await runCommand('git', ['clone', info.repo, repoName], {
              cwd: parentDir,
              silent: true
            });
          }

          // Run npm install if package.json exists
          const packagePath = path.join(path.dirname(expandedPath), 'package.json');
          if (fs.existsSync(packagePath)) {
            await runCommand('npm', ['install'], {
              cwd: path.dirname(expandedPath),
              silent: true
            });
          }
        }

        // Check if launcher file exists
        if (!fs.existsSync(expandedPath)) {
          throw new Error(`Launcher file not found after installation: ${expandedPath}`);
        }

        // Register with OpenCLI
        await registerWithOpenCLI(expandedPath);

        result.status = 'success';
        successCount++;

        if (!options.json) {
          console.log(`  ✅ ${name} installed successfully`);
        }

      } catch (error) {
        result.status = 'error';
        result.error = error.message;

        if (!options.json) {
          console.log(`  ❌ ${name} failed: ${error.message}`);
        }
      }

      results.push(result);
    }

    // Output final result
    if (options.json) {
      console.log(JSON.stringify({
        status: successCount === cliNames.length ? 'success' : 'partial',
        action: 'install_all',
        data: {
          installed: successCount,
          total: cliNames.length,
          clis: results
        }
      }, null, 2));
    } else {
      console.log('');
      console.log(`Installation complete: ${successCount}/${cliNames.length} CLIs installed successfully`);

      if (successCount < cliNames.length) {
        console.log('');
        console.log('Failed installations:');
        results.filter(r => r.status === 'error').forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
      }

      if (successCount > 0) {
        console.log('');
        console.log('All installed CLIs are now available via:');
        results.filter(r => r.status === 'success').forEach(r => {
          console.log(`  opencli ${r.name}`);
        });
      }
    }

  } catch (error) {
    throw new Error(`Failed to install CLIs: ${error.message}`);
  }
}