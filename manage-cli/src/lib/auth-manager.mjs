import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AuthManager {
  constructor() {
    this.supabase = null;
    this.sessionPath = path.join(homedir(), '.manage-cli', 'session.json');
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
    try {
      // Try to load existing session
      const session = await this.loadSession();
      if (session) {
        // Set the session
        await this.supabase.auth.setSession(session);

        // Verify the session is still valid
        const { data: { user }, error } = await this.supabase.auth.getUser();
        if (!error && user) {
          return user;
        }
      }

      // No valid session, try anonymous/migration user
      return await this.getMigrationUser();

    } catch (error) {
      console.warn('Auth warning:', error.message);
      return await this.getMigrationUser();
    }
  }

  async getMigrationUser() {
    // For migration and local development, use a default user
    const defaultEmail = process.env.CLI_DEFAULT_USER_EMAIL || 'migration@local.dev';

    // Try to find existing user
    const { data: existingUser, error: findError } = await this.supabase
      .from('cli_simple.users')
      .select('id')
      .eq('email', defaultEmail)
      .single();

    if (existingUser) {
      return { id: existingUser.id, email: defaultEmail };
    }

    // Create default user if not found
    const { data: newUser, error: createError } = await this.supabase
      .from('cli_simple.users')
      .insert({
        email: defaultEmail,
        username: 'migration_user'
      })
      .select('id')
      .single();

    if (createError) {
      throw new Error(`Failed to create migration user: ${createError.message}`);
    }

    return { id: newUser.id, email: defaultEmail };
  }

  async signUp(email, password, username = null) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0]
        }
      }
    });

    if (error) {
      throw new Error(`Sign up failed: ${error.message}`);
    }

    // Save session
    if (data.session) {
      await this.saveSession(data.session);
    }

    return data.user;
  }

  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    // Save session
    if (data.session) {
      await this.saveSession(data.session);
    }

    return data.user;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }

    // Remove saved session
    await this.clearSession();
  }

  async loadSession() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        return null;
      }

      const sessionData = fs.readFileSync(this.sessionPath, 'utf8');
      const session = JSON.parse(sessionData);

      // Check if session is expired
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        await this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.warn('Failed to load session:', error.message);
      return null;
    }
  }

  async saveSession(session) {
    try {
      const sessionDir = path.dirname(this.sessionPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
    } catch (error) {
      console.warn('Failed to save session:', error.message);
    }
  }

  async clearSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
    } catch (error) {
      console.warn('Failed to clear session:', error.message);
    }
  }

  async createUserProfile(userData) {
    const { data, error } = await this.supabase
      .from('cli_simple.users')
      .insert({
        email: userData.email,
        username: userData.username
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }

    return data;
  }

  async getUserProfile(userId) {
    const { data, error } = await this.supabase
      .from('cli_simple.users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }

    return data;
  }

  isAuthenticated() {
    return fs.existsSync(this.sessionPath);
  }

  // Interactive authentication for CLI
  async interactiveLogin() {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (prompt) => new Promise((resolve) => {
      rl.question(prompt, resolve);
    });

    try {
      console.log('\n🔐 Authentication required for manage-cli');
      console.log('Choose an option:');
      console.log('1. Sign in with existing account');
      console.log('2. Create new account');
      console.log('3. Continue with migration user (local development)');

      const choice = await question('\nEnter your choice (1/2/3): ');

      switch (choice.trim()) {
        case '1':
          const email = await question('Email: ');
          const password = await question('Password: ');
          const user = await this.signIn(email, password);
          console.log(`✅ Signed in as ${user.email}`);
          return user;

        case '2':
          const newEmail = await question('Email: ');
          const newPassword = await question('Password: ');
          const username = await question('Username (optional): ');
          const newUser = await this.signUp(newEmail, newPassword, username || null);
          console.log(`✅ Account created for ${newUser.email}`);
          return newUser;

        case '3':
        default:
          console.log('✅ Using migration user for local development');
          return await this.getMigrationUser();
      }

    } finally {
      rl.close();
    }
  }
}

export default AuthManager;