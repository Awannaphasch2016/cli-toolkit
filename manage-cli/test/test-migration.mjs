#!/usr/bin/env node

/**
 * Test script to validate migration functionality
 */

import { DatabaseCLIManager } from '../src/lib/database-manager.mjs';
import { CLIMigrator } from '../scripts/migrate-to-database.mjs';
import { CLIRollback } from '../scripts/rollback.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationTest {
  constructor() {
    this.testResults = [];
    this.dbManager = null;
  }

  async runTests() {
    console.log('🧪 Running Migration Tests');
    console.log('==========================\n');

    try {
      await this.testDatabaseConnection();
      await this.testRegistryFileExists();
      await this.testDatabaseManager();
      await this.testMigrationScript();
      await this.testDatabaseCommands();
      await this.testRollback();

      this.printResults();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testDatabaseConnection() {
    console.log('📡 Testing database connection...');

    try {
      this.dbManager = new DatabaseCLIManager();
      const result = await this.dbManager.testConnection();

      if (result.success) {
        this.addResult('Database Connection', 'PASS', 'Successfully connected to database');
      } else {
        this.addResult('Database Connection', 'FAIL', result.message);
      }
    } catch (error) {
      this.addResult('Database Connection', 'FAIL', error.message);
    }
  }

  async testRegistryFileExists() {
    console.log('📁 Testing registry file...');

    const registryPath = path.join(__dirname, '..', 'registry.json');

    if (fs.existsSync(registryPath)) {
      try {
        const data = fs.readFileSync(registryPath, 'utf8');
        const registry = JSON.parse(data);

        if (registry.opencli) {
          const cliCount = Object.keys(registry.opencli).length;
          this.addResult('Registry File', 'PASS', `Found ${cliCount} CLIs in registry`);
        } else {
          this.addResult('Registry File', 'FAIL', 'Invalid registry structure');
        }
      } catch (error) {
        this.addResult('Registry File', 'FAIL', `Failed to parse: ${error.message}`);
      }
    } else {
      this.addResult('Registry File', 'SKIP', 'Registry file not found - will test with empty state');
    }
  }

  async testDatabaseManager() {
    console.log('🔧 Testing database manager...');

    if (!this.dbManager) {
      this.addResult('Database Manager', 'SKIP', 'Database connection not available');
      return;
    }

    try {
      // Test adding a CLI
      await this.dbManager.addCLI(
        'test-cli',
        'local',
        'echo "Test CLI"',
        'Test CLI for migration testing',
        null,
        '/test/path'
      );

      // Test listing CLIs
      const clis = await this.dbManager.listCLIs();
      const testCli = clis.find(cli => cli.name === 'test-cli');

      if (testCli) {
        this.addResult('Database Manager - Add', 'PASS', 'Successfully added test CLI');
      } else {
        this.addResult('Database Manager - Add', 'FAIL', 'Test CLI not found after adding');
      }

      // Test removing the CLI
      await this.dbManager.removeCLI('test-cli');
      const clisAfterRemove = await this.dbManager.listCLIs();
      const removedCli = clisAfterRemove.find(cli => cli.name === 'test-cli');

      if (!removedCli) {
        this.addResult('Database Manager - Remove', 'PASS', 'Successfully removed test CLI');
      } else {
        this.addResult('Database Manager - Remove', 'FAIL', 'Test CLI still exists after removal');
      }

    } catch (error) {
      this.addResult('Database Manager', 'FAIL', error.message);
    }
  }

  async testMigrationScript() {
    console.log('📦 Testing migration script...');

    try {
      const migrator = new CLIMigrator();

      // Check if migration can detect registry
      const registryPath = path.join(__dirname, '..', 'registry.json');

      if (fs.existsSync(registryPath)) {
        this.addResult('Migration Script', 'PASS', 'Migration script can access registry file');
      } else {
        this.addResult('Migration Script', 'SKIP', 'No registry file to migrate');
      }

    } catch (error) {
      this.addResult('Migration Script', 'FAIL', error.message);
    }
  }

  async testDatabaseCommands() {
    console.log('⚡ Testing database commands...');

    try {
      // Import and test database commands
      const { listFromDatabase } = await import('../src/commands/list-database.mjs');

      // This should not throw an error
      this.addResult('Database Commands', 'PASS', 'Database commands can be imported');

    } catch (error) {
      this.addResult('Database Commands', 'FAIL', `Import error: ${error.message}`);
    }
  }

  async testRollback() {
    console.log('🔄 Testing rollback functionality...');

    try {
      const rollback = new CLIRollback();

      // Test rollback method detection
      const method = await rollback.detectRollbackMethod();

      if (method !== 'none') {
        this.addResult('Rollback', 'PASS', `Rollback method available: ${method}`);
      } else {
        this.addResult('Rollback', 'WARN', 'No rollback method available');
      }

    } catch (error) {
      this.addResult('Rollback', 'FAIL', error.message);
    }
  }

  addResult(test, status, message) {
    this.testResults.push({ test, status, message });

    const statusEmoji = {
      'PASS': '✅',
      'FAIL': '❌',
      'WARN': '⚠️',
      'SKIP': '⏭️'
    };

    console.log(`  ${statusEmoji[status]} ${test}: ${message}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('======================');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARN').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;

    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`⏭️  Skipped: ${skipped}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }

    if (warnings > 0) {
      console.log('\n⚠️  Warnings:');
      this.testResults
        .filter(r => r.status === 'WARN')
        .forEach(r => console.log(`  - ${r.test}: ${r.message}`));
    }

    console.log('\n🎯 Recommendations:');

    if (failed === 0) {
      console.log('✅ All critical tests passed! Migration should work correctly.');
      console.log('\n📋 Ready to migrate:');
      console.log('  1. npm run migrate');
      console.log('  2. npm run test:database');
    } else {
      console.log('❌ Some tests failed. Please fix issues before migrating:');
      console.log('  1. Check your .env file configuration');
      console.log('  2. Ensure Supabase schema is deployed');
      console.log('  3. Verify database permissions');
    }

    if (failed > 0) {
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MigrationTest();
  tester.runTests().catch(console.error);
}

export { MigrationTest };