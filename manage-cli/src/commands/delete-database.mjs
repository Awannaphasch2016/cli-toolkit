import { DatabaseCLIManager } from '../lib/database-manager.mjs';

export async function deleteFromDatabase(name, options = {}) {
  if (!name) {
    throw new Error('CLI name is required');
  }

  const dbManager = new DatabaseCLIManager();

  try {
    // Test database connection
    const connectionTest = await dbManager.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Database connection failed: ${connectionTest.message}`);
    }

    // Check if CLI exists
    const existingCLI = await dbManager.getCLI(name);
    if (!existingCLI) {
      throw new Error(`CLI '${name}' is not found in database`);
    }

    // Remove from database
    await dbManager.removeCLI(name);

    // Output result
    if (options.json) {
      console.log(JSON.stringify({
        status: 'success',
        action: 'delete_cli_database',
        data: {
          name,
          removed: true
        }
      }, null, 2));
    } else {
      console.log(`✅ Removed '${name}' from database`);
      console.log('\n⚠️  Note: This only removes the CLI from database tracking.');
      console.log('   To fully uninstall, you may need to:');
      console.log(`   1. Remove from OpenCLI: opencli unregister ${name}`);
      console.log('   2. Remove files manually if installed locally');
    }

  } catch (error) {
    throw new Error(`Failed to remove CLI from database: ${error.message}`);
  }
}