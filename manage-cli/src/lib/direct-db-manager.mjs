import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const { Pool } = pg;

export class DirectDatabaseManager {
  constructor() {
    this.pool = null;
    this.currentUserId = null;
    this.initializePool();
  }

  initializePool() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('Missing DATABASE_URL. Please set DATABASE_URL environment variable');
    }

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false // Required for Supabase
      }
    });
  }

  async getCurrentUser() {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    const defaultEmail = process.env.CLI_DEFAULT_USER_EMAIL || 'migration@local.dev';

    try {
      // Try to find existing user
      const result = await this.pool.query(
        'SELECT id FROM cli_simple.users WHERE email = $1',
        [defaultEmail]
      );

      if (result.rows.length > 0) {
        this.currentUserId = result.rows[0].id;
        return this.currentUserId;
      }

      // Create new user
      const createResult = await this.pool.query(
        'INSERT INTO cli_simple.users (email, username) VALUES ($1, $2) RETURNING id',
        [defaultEmail, 'migration_user']
      );

      this.currentUserId = createResult.rows[0].id;
      return this.currentUserId;

    } catch (error) {
      throw new Error(`Failed to get/create user: ${error.message}`);
    }
  }

  async addCLI(name, installType, installCommand, description = null, repositoryUrl = null, launcherPath = null) {
    const userId = await this.getCurrentUser();

    try {
      const result = await this.pool.query(`
        INSERT INTO cli_simple.managed_clis
        (user_id, name, install_type, install_command, description, repository_url, launcher_path, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [userId, name, installType, installCommand, description, repositoryUrl, launcherPath, true]);

      return result.rows[0];

    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`CLI '${name}' is already managed`);
      }
      throw new Error(`Failed to add CLI: ${error.message}`);
    }
  }

  async removeCLI(name) {
    const userId = await this.getCurrentUser();

    try {
      await this.pool.query(
        'UPDATE cli_simple.managed_clis SET is_active = false WHERE user_id = $1 AND name = $2',
        [userId, name]
      );
      return true;
    } catch (error) {
      throw new Error(`Failed to remove CLI: ${error.message}`);
    }
  }

  async listCLIs() {
    const userId = await this.getCurrentUser();

    try {
      const result = await this.pool.query(`
        SELECT * FROM cli_simple.managed_clis
        WHERE user_id = $1 AND is_active = true
        ORDER BY name
      `, [userId]);

      return result.rows;
    } catch (error) {
      throw new Error(`Failed to list CLIs: ${error.message}`);
    }
  }

  async getCLI(name) {
    const userId = await this.getCurrentUser();

    try {
      const result = await this.pool.query(`
        SELECT * FROM cli_simple.managed_clis
        WHERE user_id = $1 AND name = $2 AND is_active = true
      `, [userId, name]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw new Error(`Failed to get CLI: ${error.message}`);
    }
  }

  async updateInstallStatus(name, status = 'installed') {
    const userId = await this.getCurrentUser();

    try {
      await this.pool.query(`
        UPDATE cli_simple.managed_clis
        SET last_installed = $3, updated_at = NOW()
        WHERE user_id = $1 AND name = $2
      `, [userId, name, status === 'installed' ? new Date() : null]);

      return true;
    } catch (error) {
      throw new Error(`Failed to update install status: ${error.message}`);
    }
  }

  async getInstallCommands() {
    const clis = await this.listCLIs();
    return clis.map(cli => ({
      name: cli.name,
      command: cli.install_command,
      type: cli.install_type
    }));
  }

  // Helper method to determine install type from existing data
  static determineInstallType(path, repo, description = '') {
    if (repo && repo.includes('github.com')) {
      return 'git';
    }
    if (path && path.includes('opencli')) {
      return 'opencli';
    }
    if (description && description.toLowerCase().includes('skill')) {
      return 'skillport';
    }
    if (path && path.startsWith('/')) {
      return 'local';
    }
    return 'local'; // default
  }

  // Helper method to generate install command
  static generateInstallCommand(installType, path, repo, name) {
    switch (installType) {
      case 'git':
        return repo ? `git clone ${repo}` : `echo "No repository URL for ${name}"`;
      case 'opencli':
        return path ? `opencli register ${path}` : `echo "No path for ${name}"`;
      case 'skillport':
        return `skillport add ${name}`;
      case 'npx':
        return `npx skill ${name}`;
      case 'local':
        return path ? `echo "Local CLI at ${path}"` : `echo "No path for ${name}"`;
      default:
        return `echo "Unknown install type for ${name}"`;
    }
  }

  // Test connection
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT 1 as test');
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }

  // Create schema if it doesn't exist
  async ensureSchema() {
    try {
      await this.pool.query(`
        CREATE SCHEMA IF NOT EXISTS cli_simple;

        CREATE TABLE IF NOT EXISTS cli_simple.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT UNIQUE NOT NULL,
          username TEXT UNIQUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS cli_simple.managed_clis (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES cli_simple.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          install_type TEXT NOT NULL CHECK (install_type IN ('npx', 'skillport', 'git', 'local', 'opencli')),
          install_command TEXT NOT NULL,
          description TEXT,
          repository_url TEXT,
          launcher_path TEXT,
          is_active BOOLEAN DEFAULT true,
          last_installed TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, name)
        );
      `);

      return { success: true, message: 'Schema ensured' };
    } catch (error) {
      return { success: false, message: `Schema creation failed: ${error.message}` };
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export default DirectDatabaseManager;