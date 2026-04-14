import { DirectDatabaseManager } from '../lib/direct-db-manager.mjs';

export async function listFromDirectDatabase(options = {}) {
  const dbManager = new DirectDatabaseManager();

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
          action: 'list_database',
          data: {
            count: 0,
            clis: []
          }
        }, null, 2));
      } else {
        console.log('No CLIs found in database');
        console.log('\nTo add CLIs to database:');
        console.log('  manage-cli add-db <name> <path>');
        console.log('\nTo migrate from registry.json:');
        console.log('  node scripts/migrate-direct.mjs');
      }
      return;
    }

    // Output results
    if (options.json) {
      console.log(JSON.stringify({
        status: 'success',
        action: 'list_database',
        data: {
          count: clis.length,
          clis: clis.map(cli => ({
            name: cli.name,
            install_type: cli.install_type,
            install_command: cli.install_command,
            description: cli.description,
            repository_url: cli.repository_url,
            launcher_path: cli.launcher_path,
            last_installed: cli.last_installed,
            is_active: cli.is_active,
            created_at: cli.created_at
          }))
        }
      }, null, 2));
    } else {
      console.log(`📦 Managed CLIs (${clis.length}):\n`);

      clis.forEach(cli => {
        console.log(`🔧 ${cli.name}`);
        console.log(`   Type: ${cli.install_type}`);
        console.log(`   Command: ${cli.install_command}`);
        if (cli.description) {
          console.log(`   Description: ${cli.description}`);
        }
        if (cli.repository_url) {
          console.log(`   Repository: ${cli.repository_url}`);
        }
        if (cli.last_installed) {
          const lastInstalled = new Date(cli.last_installed).toLocaleString();
          console.log(`   Last installed: ${lastInstalled}`);
        }
        console.log();
      });

      console.log('💡 Usage:');
      console.log('  manage-cli install-db --all   Install all CLIs');
      console.log('  manage-cli remove-db <name>   Remove CLI from database');
    }

  } catch (error) {
    throw new Error(`Failed to list CLIs from database: ${error.message}`);
  } finally {
    await dbManager.close();
  }
}