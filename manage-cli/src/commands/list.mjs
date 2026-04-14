import { loadRegistry } from '../lib/registry.mjs';

export async function listOpenCLI(options = {}) {
  try {
    // Load current registry
    const registry = loadRegistry();

    const clis = registry.opencli;
    const cliNames = Object.keys(clis);

    if (cliNames.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({
          status: 'success',
          action: 'list_clis',
          data: {
            count: 0,
            clis: []
          }
        }, null, 2));
      } else {
        console.log('No CLIs registered in opencli registry');
        console.log('');
        console.log('Add CLIs with: manage-cli add opencli <name> <path>');
      }
      return;
    }

    // Output result
    if (options.json) {
      const cliList = cliNames.map(name => ({
        name,
        path: clis[name].path,
        description: clis[name].description,
        repo: clis[name].repo || null
      }));

      console.log(JSON.stringify({
        status: 'success',
        action: 'list_clis',
        data: {
          count: cliNames.length,
          clis: cliList
        }
      }, null, 2));
    } else {
      console.log(`Registered CLIs (${cliNames.length}):`);
      console.log('');

      for (const name of cliNames) {
        const info = clis[name];
        console.log(`  ${name}`);
        console.log(`    Description: ${info.description}`);
        console.log(`    Path: ${info.path}`);
        if (info.repo) {
          console.log(`    Repository: ${info.repo}`);
        }
        console.log('');
      }

      console.log('Usage:');
      console.log('  manage-cli add opencli <name> <path>    - Add new CLI');
      console.log('  manage-cli delete opencli <name>       - Remove CLI');
      console.log('  manage-cli install opencli --all       - Install all CLIs');
    }

  } catch (error) {
    throw new Error(`Failed to list CLIs: ${error.message}`);
  }
}