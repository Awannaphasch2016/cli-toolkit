#!/usr/bin/env node

import { parseArgs } from 'node:util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
    json: { type: 'boolean', default: false },
    all: { type: 'boolean', default: false },
    database: { type: 'boolean', default: false }
  }
});

const [action, registry, name, ...rest] = positionals;

function showHelp() {
  console.log(`manage-cli - Simple CLI management for OpenCLI registry

Usage:
  manage-cli <action> <registry> [name] [options]

File-based Commands (legacy):
  add opencli <name> <path>     Add CLI to opencli registry file
  delete opencli <name>         Remove CLI from opencli registry file
  list opencli                  List all registered CLIs from file
  install opencli --all         Install all CLIs from registry file

Database Commands (new):
  add-db <name> <path>         Add CLI to database
  delete-db <name>             Remove CLI from database
  list-db                      List all CLIs from database
  install-db --all             Install all CLIs from database
  migrate                      Migrate from registry.json to database

Options:
  --help, -h                    Show this help message
  --version, -v                 Show version number
  --json                        Output in JSON format
  --all                         Apply to all CLIs (for install)
  --database                    Use database instead of file

Examples:
  manage-cli add opencli blog ~/dev/blog-cli/blog-launcher.js
  manage-cli add-db blog ~/dev/blog-cli/blog-launcher.js
  manage-cli list-db --json
  manage-cli migrate`);
}

function showVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(pkg.version);
}

if (values.help || (!action && !values.version)) {
  showHelp();
  process.exit(0);
}

if (values.version) {
  showVersion();
  process.exit(0);
}

// Validate registry parameter (skip for new database commands)
const dbCommands = ['add-db', 'delete-db', 'list-db', 'install-db', 'migrate'];
if (!dbCommands.includes(action) && registry !== 'opencli') {
  console.error('Error: Only "opencli" registry is supported for legacy commands');
  console.error('Usage: manage-cli <action> opencli [name] [options]');
  process.exit(1);
}

try {
  switch (action) {
    // Legacy file-based commands
    case 'add':
      if (!name || rest.length === 0) {
        console.error('Error: CLI name and path required');
        console.error('Usage: manage-cli add opencli <name> <path>');
        process.exit(1);
      }
      const { addToOpenCLI } = await import('../src/commands/add.mjs');
      await addToOpenCLI(name, rest[0], { json: values.json });
      break;

    case 'delete':
      if (!name) {
        console.error('Error: CLI name required');
        console.error('Usage: manage-cli delete opencli <name>');
        process.exit(1);
      }
      const { deleteFromOpenCLI } = await import('../src/commands/delete.mjs');
      await deleteFromOpenCLI(name, { json: values.json });
      break;

    case 'list':
      const { listOpenCLI } = await import('../src/commands/list.mjs');
      await listOpenCLI({ json: values.json });
      break;

    case 'install':
      if (!values.all) {
        console.error('Error: --all flag required for install');
        console.error('Usage: manage-cli install opencli --all');
        process.exit(1);
      }
      const { installAllOpenCLI } = await import('../src/commands/install.mjs');
      await installAllOpenCLI({ json: values.json });
      break;

    // New database commands
    case 'add-db':
      if (!registry || !name) {
        console.error('Error: CLI name and path required');
        console.error('Usage: manage-cli add-db <name> <path>');
        process.exit(1);
      }
      const { addToDirectDatabase } = await import('../src/commands/add-database-direct.mjs');
      await addToDirectDatabase(registry, name, { json: values.json });
      break;

    case 'delete-db':
      if (!registry) {
        console.error('Error: CLI name required');
        console.error('Usage: manage-cli delete-db <name>');
        process.exit(1);
      }
      const { deleteFromDatabase } = await import('../src/commands/delete-database.mjs');
      await deleteFromDatabase(registry, { json: values.json });
      break;

    case 'list-db':
      const { listFromDirectDatabase } = await import('../src/commands/list-database-direct.mjs');
      await listFromDirectDatabase({ json: values.json });
      break;

    case 'install-db':
      if (!values.all) {
        console.error('Error: --all flag required for database install');
        console.error('Usage: manage-cli install-db --all');
        process.exit(1);
      }
      const { installAllFromDatabase } = await import('../src/commands/install-database.mjs');
      await installAllFromDatabase({ json: values.json });
      break;

    case 'migrate':
      const { CLIMigrator } = await import('../scripts/migrate-to-database.mjs');
      const migrator = new CLIMigrator();
      await migrator.migrate();
      break;

    default:
      console.error(`Error: Unknown action: ${action}`);
      console.error('Available actions: add, delete, list, install (legacy)');
      console.error('                  add-db, delete-db, list-db, install-db, migrate (database)');
      process.exit(1);
  }
} catch (error) {
  if (values.json) {
    console.log(JSON.stringify({
      status: 'error',
      message: error.message
    }, null, 2));
  } else {
    console.error(`Error: ${error.message}`);
  }
  process.exit(1);
}