import { loadRegistry, saveRegistry } from '../lib/registry.mjs';

export async function deleteFromOpenCLI(name, options = {}) {
  // Validate inputs
  if (!name) {
    throw new Error('CLI name is required');
  }

  // Load current registry
  const registry = loadRegistry();

  // Check if CLI exists
  if (!registry.opencli[name]) {
    throw new Error(`CLI '${name}' is not registered`);
  }

  try {
    // Store info for output before deleting
    const cliInfo = registry.opencli[name];

    // Remove from registry
    delete registry.opencli[name];

    // Save registry
    saveRegistry(registry);

    // Note: OpenCLI doesn't have an unregister command,
    // so we only remove from our registry
    // Users would need to manually edit ~/.opencli/external-clis.yaml

    // Output result
    if (options.json) {
      console.log(JSON.stringify({
        status: 'success',
        action: 'delete_cli',
        data: {
          name,
          path: cliInfo.path
        },
        warning: 'CLI removed from registry. You may need to manually remove from ~/.opencli/external-clis.yaml'
      }, null, 2));
    } else {
      console.log(`✅ Removed '${name}' from registry`);
      console.log(`   Path: ${cliInfo.path}`);
      console.log('');
      console.log('⚠️  Note: CLI removed from manage-cli registry.');
      console.log('   You may need to manually remove it from ~/.opencli/external-clis.yaml');
      console.log('   or restart opencli daemon to unregister completely.');
    }

  } catch (error) {
    throw new Error(`Failed to delete CLI: ${error.message}`);
  }
}