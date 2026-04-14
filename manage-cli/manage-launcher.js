#!/usr/bin/env node

/**
 * manage-cli launcher for OpenCLI integration
 * This launcher ensures compatibility with opencli's external CLI system
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the main CLI
const manageCliPath = join(__dirname, 'bin', 'manage.mjs');

// Forward all arguments to the main CLI
const args = process.argv.slice(2);

// Spawn the main CLI process
const child = spawn('node', [manageCliPath, ...args], {
  stdio: 'inherit',
  shell: false
});

// Handle process events
child.on('error', (error) => {
  console.error('Failed to start manage-cli:', error.message);
  process.exit(1);
});

child.on('close', (code) => {
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});