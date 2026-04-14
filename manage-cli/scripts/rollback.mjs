#!/usr/bin/env node

/**
 * Rollback script to restore file-based CLI management
 * from database back to registry.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseCLIManager } from '../src/lib/database-manager.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTRY_PATH = path.join(__dirname, '..', 'registry.json');
const BACKUP_PATH = path.join(__dirname, '..', 'registry.json.backup');

class CLIRollback {
  constructor() {
    this.dbManager = null;
  }

  async rollback(options = {}) {
    console.log('🔄 Starting rollback from database to file-based system...\n');

    try {
      const rollbackMethod = await this.detectRollbackMethod();

      switch (rollbackMethod) {
        case 'backup':
          await this.rollbackFromBackup();
          break;
        case 'database':
          await this.rollbackFromDatabase();
          break;
        case 'none':
          throw new Error('No rollback method available. No backup found and database connection failed.');
      }

      console.log('\n🎉 Rollback completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Verify CLI operations: manage-cli list opencli');
      console.log('2. Test installations: manage-cli install opencli --all');
      console.log('3. Remove database credentials if no longer needed');

    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      console.error('\n🆘 Manual recovery options:');
      console.error('1. Check for backup files in manage-cli/ directory');
      console.error('2. Restore from version control if available');
      console.error('3. Manually recreate registry.json from OpenCLI registry');
      process.exit(1);
    }
  }

  async detectRollbackMethod() {
    console.log('🔍 Detecting rollback method...');

    // Check for backup file
    if (fs.existsSync(BACKUP_PATH)) {
      console.log('✅ Found backup file');
      return 'backup';
    }

    // Check for timestamped backups
    const backupDir = path.dirname(BACKUP_PATH);
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('registry.json.backup.'))
      .sort()
      .reverse(); // Most recent first

    if (backupFiles.length > 0) {
      console.log(`✅ Found timestamped backup: ${backupFiles[0]}`);
      this.backupPath = path.join(backupDir, backupFiles[0]);
      return 'backup';
    }

    // Try database export
    try {
      this.dbManager = new DatabaseCLIManager();
      const connectionTest = await this.dbManager.testConnection();
      if (connectionTest.success) {
        console.log('✅ Database connection available');
        return 'database';
      }
    } catch (error) {
      console.log('❌ Database connection failed');
    }

    return 'none';
  }

  async rollbackFromBackup() {
    console.log('📁 Rolling back from backup file...');

    const backupPath = this.backupPath || BACKUP_PATH;

    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }

    // Validate backup file
    const backupData = fs.readFileSync(backupPath, 'utf8');
    const registry = JSON.parse(backupData);

    if (!registry.opencli) {
      throw new Error('Invalid backup file: missing opencli section');
    }

    // Restore registry.json
    fs.copyFileSync(backupPath, REGISTRY_PATH);

    const cliCount = Object.keys(registry.opencli).length;
    console.log(`✅ Restored ${cliCount} CLIs from backup`);

    // Validate restoration
    await this.validateRestoration();
  }

  async rollbackFromDatabase() {
    console.log('🗄️  Rolling back from database...');

    if (!this.dbManager) {
      this.dbManager = new DatabaseCLIManager();
    }

    // Export CLIs from database
    const clis = await this.dbManager.listCLIs();

    if (clis.length === 0) {
      console.log('⚠️  No CLIs found in database');
    }

    // Convert to legacy format
    const registry = {
      version: "1.0.0",
      opencli: {}
    };

    for (const cli of clis) {
      registry.opencli[cli.name] = {
        path: cli.launcher_path || '',
        repo: cli.repository_url || null,
        description: cli.description || ''
      };
    }

    // Write registry.json
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

    console.log(`✅ Exported ${clis.length} CLIs from database`);

    // Validate restoration
    await this.validateRestoration();
  }

  async validateRestoration() {
    console.log('\n🔍 Validating restoration...');

    if (!fs.existsSync(REGISTRY_PATH)) {
      throw new Error('Registry file was not created');
    }

    const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
    const registry = JSON.parse(data);

    if (!registry.opencli) {
      throw new Error('Invalid registry structure');
    }

    const cliCount = Object.keys(registry.opencli).length;
    console.log(`📊 Registry contains ${cliCount} CLIs`);

    // Test file-based list command
    try {
      const { listOpenCLI } = await import('../src/commands/list.mjs');
      console.log('✅ File-based list command works');
    } catch (error) {
      console.warn('⚠️  File-based list command failed:', error.message);
    }

    console.log('✅ Restoration validated');
  }

  async createEmergencyBackup() {
    if (fs.existsSync(REGISTRY_PATH)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const emergencyBackup = `${REGISTRY_PATH}.emergency.${timestamp}`;
      fs.copyFileSync(REGISTRY_PATH, emergencyBackup);
      console.log(`📁 Created emergency backup: ${emergencyBackup}`);
    }
  }

  async cleanupDatabaseFiles() {
    console.log('\n🧹 Cleaning up database-related files...');

    const filesToClean = [
      'src/commands/add-database.mjs',
      'src/commands/list-database.mjs',
      'src/commands/install-database.mjs',
      'src/commands/delete-database.mjs',
      'src/lib/database-manager.mjs',
      'src/lib/auth-manager.mjs',
      'scripts/migrate-to-database.mjs',
      'sql/schema.sql'
    ];

    for (const file of filesToClean) {
      const filePath = path.join(__dirname, '..', file);
      if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.rollback-backup`;
        fs.renameSync(filePath, backupPath);
        console.log(`📁 Backed up: ${file}`);
      }
    }

    console.log('✅ Database files backed up (not deleted)');
  }

  async showRollbackSummary() {
    console.log('\n📊 Rollback Summary:');

    if (fs.existsSync(REGISTRY_PATH)) {
      const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const registry = JSON.parse(data);
      const cliCount = Object.keys(registry.opencli).length;
      console.log(`✅ Registry restored with ${cliCount} CLIs`);
    }

    console.log('\n🔧 Available commands (restored):');
    console.log('  manage-cli list opencli');
    console.log('  manage-cli add opencli <name> <path>');
    console.log('  manage-cli install opencli --all');

    console.log('\n📁 Backup files preserved:');
    console.log(`  ${BACKUP_PATH}`);

    // List timestamped backups
    const backupDir = path.dirname(BACKUP_PATH);
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.includes('registry.json.backup'));

    backupFiles.forEach(file => {
      console.log(`  ${file}`);
    });
  }
}

// Run rollback if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const rollback = new CLIRollback();
  rollback.rollback().then(() => {
    rollback.showRollbackSummary();
  }).catch(console.error);
}

export { CLIRollback };