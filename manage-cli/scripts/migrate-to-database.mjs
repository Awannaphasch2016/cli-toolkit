#!/usr/bin/env node

/**
 * Migration script to move from registry.json to Supabase database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseCLIManager } from '../src/lib/database-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '..', 'registry.json');
const BACKUP_PATH = path.join(__dirname, '..', 'registry.json.backup');

class CLIMigrator {
  constructor() {
    this.dbManager = new DatabaseCLIManager();
  }

  async migrate() {
    console.log('🚀 Starting CLI migration from registry.json to database...\n');

    try {
      // Test database connection
      console.log('📡 Testing database connection...');
      const connectionTest = await this.dbManager.testConnection();
      if (!connectionTest.success) {
        throw new Error(connectionTest.message);
      }
      console.log('✅ Database connection successful\n');

      // Backup existing registry
      await this.backupRegistry();

      // Load current registry
      const registryData = await this.loadRegistry();

      // Migrate CLIs
      await this.migrateCLIs(registryData);

      // Validate migration
      await this.validateMigration(registryData);

      console.log('\n🎉 Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Test the new database commands: npm run test:database');
      console.log('2. Update your .env file with Supabase credentials');
      console.log('3. Run: manage-cli list opencli --database');

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      console.error('\n🔄 To rollback, run: npm run rollback');
      process.exit(1);
    }
  }

  async backupRegistry() {
    if (!fs.existsSync(REGISTRY_PATH)) {
      throw new Error('Registry file not found. Nothing to migrate.');
    }

    console.log('💾 Creating backup of registry.json...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const timestampedBackup = `${BACKUP_PATH}.${timestamp}`;

    fs.copyFileSync(REGISTRY_PATH, timestampedBackup);
    fs.copyFileSync(REGISTRY_PATH, BACKUP_PATH);
    console.log(`✅ Backup created: ${timestampedBackup}\n`);
  }

  async loadRegistry() {
    console.log('📖 Loading registry.json...');
    const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(data);

    if (!registry.opencli) {
      throw new Error('Invalid registry format: missing opencli section');
    }

    const cliCount = Object.keys(registry.opencli).length;
    console.log(`✅ Found ${cliCount} CLIs to migrate\n`);

    return registry;
  }

  async migrateCLIs(registryData) {
    console.log('🔄 Migrating CLIs to database...');

    const clis = registryData.opencli;
    const results = [];

    for (const [name, cliData] of Object.entries(clis)) {
      try {
        console.log(`  📦 Migrating ${name}...`);

        // Determine install type and command
        const installType = DatabaseCLIManager.determineInstallType(
          cliData.path,
          cliData.repo,
          cliData.description
        );

        const installCommand = DatabaseCLIManager.generateInstallCommand(
          installType,
          cliData.path,
          cliData.repo,
          name
        );

        // Add to database
        await this.dbManager.addCLI(
          name,
          installType,
          installCommand,
          cliData.description,
          cliData.repo,
          cliData.path
        );

        console.log(`    ✅ ${name} (${installType})`);
        results.push({ name, status: 'success', type: installType });

      } catch (error) {
        console.log(`    ❌ ${name}: ${error.message}`);
        results.push({ name, status: 'failed', error: error.message });
      }
    }

    // Summary
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Successful: ${successful.length}`);
    console.log(`  ❌ Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed migrations:');
      failed.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
    }

    return results;
  }

  async validateMigration(originalRegistry) {
    console.log('\n🔍 Validating migration...');

    const dbCLIs = await this.dbManager.listCLIs();
    const originalCLIs = Object.keys(originalRegistry.opencli);

    console.log(`📊 Original CLIs: ${originalCLIs.length}`);
    console.log(`📊 Migrated CLIs: ${dbCLIs.length}`);

    // Check for missing CLIs
    const dbCLINames = dbCLIs.map(cli => cli.name);
    const missing = originalCLIs.filter(name => !dbCLINames.includes(name));

    if (missing.length > 0) {
      console.warn(`⚠️  Missing CLIs: ${missing.join(', ')}`);
    }

    // Check for extra CLIs
    const extra = dbCLINames.filter(name => !originalCLIs.includes(name));
    if (extra.length > 0) {
      console.warn(`⚠️  Extra CLIs: ${extra.join(', ')}`);
    }

    if (missing.length === 0 && extra.length === 0) {
      console.log('✅ All CLIs migrated successfully');
    }

    return {
      original: originalCLIs.length,
      migrated: dbCLIs.length,
      missing,
      extra
    };
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrator = new CLIMigrator();
  migrator.migrate().catch(console.error);
}

export { CLIMigrator };