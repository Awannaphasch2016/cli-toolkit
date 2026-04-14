-- Simplified CLI Management Schema
-- This schema tracks which CLIs are managed and how to install them

-- Create schema
CREATE SCHEMA IF NOT EXISTS cli_simple;

-- Users table
CREATE TABLE cli_simple.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Managed CLIs table
CREATE TABLE cli_simple.managed_clis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES cli_simple.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- 'react-best-practices', 'blog-cli'
  install_type TEXT NOT NULL CHECK (install_type IN ('npx', 'skillport', 'git', 'local', 'opencli')),
  install_command TEXT NOT NULL,               -- Full command to install
  description TEXT,                            -- Optional description
  repository_url TEXT,                         -- Git repo if applicable
  launcher_path TEXT,                          -- Path to launcher file
  is_active BOOLEAN DEFAULT true,
  last_installed TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Indexes for performance
CREATE INDEX idx_managed_clis_user ON cli_simple.managed_clis(user_id);
CREATE INDEX idx_managed_clis_active ON cli_simple.managed_clis(is_active);
CREATE INDEX idx_managed_clis_type ON cli_simple.managed_clis(install_type);

-- Enable Row Level Security
ALTER TABLE cli_simple.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_simple.managed_clis ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data" ON cli_simple.users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users manage own CLIs" ON cli_simple.managed_clis
  FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION cli_simple.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON cli_simple.users
  FOR EACH ROW EXECUTE FUNCTION cli_simple.update_updated_at();

CREATE TRIGGER update_managed_clis_updated_at
  BEFORE UPDATE ON cli_simple.managed_clis
  FOR EACH ROW EXECUTE FUNCTION cli_simple.update_updated_at();

-- Insert default user for migration (temporary)
INSERT INTO cli_simple.users (email, username)
VALUES ('migration@local.dev', 'migration_user')
ON CONFLICT (email) DO NOTHING;