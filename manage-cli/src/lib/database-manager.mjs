import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export class DatabaseCLIManager {
  constructor() {
    this.supabase = null;
    this.currentUserId = null;
    this.initializeClient();
  }

  initializeClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getCurrentUser() {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    // For migration, use default user
    const defaultEmail = process.env.CLI_DEFAULT_USER_EMAIL || 'migration@local.dev';

    const { data, error } = await this.supabase
      .from('cli_simple.users')
      .select('id')
      .eq('email', defaultEmail)
      .single();

    if (error || !data) {
      // Create default user if not exists
      const { data: newUser, error: createError } = await this.supabase
        .from('cli_simple.users')
        .insert({
          email: defaultEmail,
          username: 'migration_user'
        })
        .select('id')
        .single();

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      this.currentUserId = newUser.id;
    } else {
      this.currentUserId = data.id;
    }

    return this.currentUserId;
  }

  async addCLI(name, installType, installCommand, description = null, repositoryUrl = null, launcherPath = null) {
    const userId = await this.getCurrentUser();

    const { data, error } = await this.supabase
      .from('cli_simple.managed_clis')
      .insert({
        user_id: userId,
        name,
        install_type: installType,
        install_command: installCommand,
        description,
        repository_url: repositoryUrl,
        launcher_path: launcherPath,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error(`CLI '${name}' is already managed`);
      }
      throw new Error(`Failed to add CLI: ${error.message}`);
    }

    return data;
  }

  async removeCLI(name) {
    const userId = await this.getCurrentUser();

    const { error } = await this.supabase
      .from('cli_simple.managed_clis')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('name', name);

    if (error) {
      throw new Error(`Failed to remove CLI: ${error.message}`);
    }

    return true;
  }

  async listCLIs() {
    const userId = await this.getCurrentUser();

    const { data, error } = await this.supabase
      .from('cli_simple.managed_clis')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error(`Failed to list CLIs: ${error.message}`);
    }

    return data || [];
  }

  async getCLI(name) {
    const userId = await this.getCurrentUser();

    const { data, error } = await this.supabase
      .from('cli_simple.managed_clis')
      .select('*')
      .eq('user_id', userId)
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw new Error(`Failed to get CLI: ${error.message}`);
    }

    return data;
  }

  async updateInstallStatus(name, status = 'installed') {
    const userId = await this.getCurrentUser();

    const { error } = await this.supabase
      .from('cli_simple.managed_clis')
      .update({
        last_installed: status === 'installed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('name', name);

    if (error) {
      throw new Error(`Failed to update install status: ${error.message}`);
    }

    return true;
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
      const { data, error } = await this.supabase
        .from('cli_simple.users')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { success: false, message: `Database connection failed: ${error.message}` };
    }
  }
}

export default DatabaseCLIManager;